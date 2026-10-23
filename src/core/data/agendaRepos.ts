import type { SaveSlotResult } from '@shared/api'
import { compareItems } from '@shared/items'
import { findOverlap, sortSlots, sortSubjects } from '@shared/schedule'
import type { AgendaData, AgendaItem } from '@shared/types'
import { isRecord, parseAgendaItem, parseScheduleSlot, parseSubject } from '@shared/validation'
import type { DataStore } from './dataStore'

/** Replaces the entry with the same id, or adds it at the end. */
function upsert<T extends { id: string }>(list: T[], entry: T): T[] {
  return list.some((existing) => existing.id === entry.id)
    ? list.map((existing) => (existing.id === entry.id ? entry : existing))
    : [...list, entry]
}

/** Drafts from the renderer keep their id when editing and get a new one when creating. */
function withId(draft: unknown): Record<string, unknown> {
  const input = isRecord(draft) ? draft : {}
  return { ...input, id: typeof input.id === 'string' && input.id ? input.id : crypto.randomUUID() }
}

export function agendaOf(store: DataStore): AgendaData {
  const { subjects, schedule, items } = store.get()
  return { subjects, schedule, items }
}

export class SubjectsRepo {
  constructor(private readonly store: DataStore) {}

  save(draft: unknown): AgendaData {
    const subject = parseSubject(withId(draft))
    if (!subject) throw new Error('Invalid subject')
    this.store.update((data) => ({
      ...data,
      subjects: sortSubjects(upsert(data.subjects, subject))
    }))
    return agendaOf(this.store)
  }

  /** Deleting a subject also deletes its classes and unlinks it from tasks and exams. */
  delete(id: unknown): AgendaData {
    this.store.update((data) => ({
      ...data,
      subjects: data.subjects.filter((subject) => subject.id !== id),
      schedule: data.schedule.filter((slot) => slot.subjectId !== id),
      items: data.items.map((item) => {
        if (item.subjectId !== id) return item
        const rest = { ...item }
        delete rest.subjectId
        return rest
      })
    }))
    return agendaOf(this.store)
  }
}

export class ScheduleRepo {
  constructor(private readonly store: DataStore) {}

  save(draft: unknown): SaveSlotResult {
    const { subjects, schedule } = this.store.get()
    const slot = parseScheduleSlot(withId(draft), new Set(subjects.map((subject) => subject.id)))
    if (!slot) throw new Error('Invalid schedule slot')

    const conflict = findOverlap(schedule, slot)
    if (conflict) return { status: 'overlap', conflict }

    this.store.update((data) => ({ ...data, schedule: sortSlots(upsert(data.schedule, slot)) }))
    return { status: 'saved', agenda: agendaOf(this.store) }
  }

  delete(id: unknown): AgendaData {
    this.store.update((data) => ({
      ...data,
      schedule: data.schedule.filter((slot) => slot.id !== id)
    }))
    return agendaOf(this.store)
  }
}

/** Keeps the moment an item was first marked as done, and clears it when it goes back to pending. */
function withCompletion(item: AgendaItem, previous: AgendaItem | undefined): AgendaItem {
  const result = { ...item }
  delete result.completedAt
  if (!item.done) return result
  result.completedAt =
    previous?.done && previous.completedAt ? previous.completedAt : new Date().toISOString()
  return result
}

/** Homework, exams, projects and events. */
export class ItemsRepo {
  constructor(private readonly store: DataStore) {}

  save(draft: unknown): AgendaData {
    const { subjects, items } = this.store.get()
    const parsed = parseAgendaItem(withId(draft), new Set(subjects.map((subject) => subject.id)))
    if (!parsed) throw new Error('Invalid agenda item')

    const item = withCompletion(
      parsed,
      items.find((existing) => existing.id === parsed.id)
    )
    this.store.update((data) => ({
      ...data,
      items: upsert(data.items, item).sort(compareItems)
    }))
    return agendaOf(this.store)
  }

  setDone(id: unknown, done: unknown): AgendaData {
    this.store.update((data) => ({
      ...data,
      items: data.items.map((item) =>
        item.id === id ? withCompletion({ ...item, done: done === true }, item) : item
      )
    }))
    return agendaOf(this.store)
  }

  delete(id: unknown): AgendaData {
    this.store.update((data) => ({ ...data, items: data.items.filter((item) => item.id !== id) }))
    return agendaOf(this.store)
  }
}
