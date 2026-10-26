import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataStore } from './dataStore'
import { HabitsRepo } from './habitsRepo'

async function openRepo(): Promise<{ store: DataStore; repo: HabitsRepo }> {
  const store = await DataStore.open({
    read: async () => null,
    write: async () => {},
    copyAside: async () => {}
  })
  return { store, repo: new HabitsRepo(store) }
}

const draft = { name: 'Leer', color: 'teal', weekdays: [1, 2, 3, 4, 5, 6, 7] }

describe('HabitsRepo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 26, 18, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('starts a new habit today and keeps that day when it is edited', async () => {
    const { repo } = await openRepo()
    const [habit] = repo.save(draft).habits
    expect(habit.createdOn).toBe('2026-10-26')

    vi.setSystemTime(new Date(2026, 10, 2))
    const [edited] = repo.save({ ...habit, name: 'Leer 20 min', createdOn: '2020-01-01' }).habits
    expect(edited).toEqual({ ...habit, name: 'Leer 20 min' })
  })

  it('marks and unmarks days that have come, and records them for the sync', async () => {
    const { store, repo } = await openRepo()
    const [habit] = repo.save(draft).habits

    const marked = repo.setMark(habit.id, '2026-10-26', 'done')
    expect(marked.marks).toEqual([
      { id: `${habit.id}/2026-10-26`, habitId: habit.id, date: '2026-10-26', status: 'done' }
    ])
    expect(store.get().sync.pending).toContain(`habitMarks/${habit.id}/2026-10-26`)
    expect(repo.setMark(habit.id, '2026-10-26', null).marks).toEqual([])

    expect(() => repo.setMark(habit.id, '2026-10-27', 'done')).toThrow()
    expect(() => repo.setMark(habit.id, '2026-10-26', 'maybe')).toThrow()
    expect(() => repo.setMark('missing', '2026-10-26', 'done')).toThrow()
  })

  it('deletes the marks together with the habit', async () => {
    const { repo } = await openRepo()
    const [habit] = repo.save(draft).habits
    repo.setMark(habit.id, '2026-10-25', 'missed')
    expect(repo.delete(habit.id)).toEqual({ habits: [], marks: [] })
  })
})
