import { toDateKey } from '@shared/dates'
import { habitMarkId, sortHabitMarks, sortHabits } from '@shared/habits'
import { HABIT_MARK_STATUSES, type HabitsData } from '@shared/types'
import { isRecord, parseHabit, parseHabitMark } from '@shared/validation'
import type { DataStore } from './dataStore'

export function habitsOf(store: DataStore): HabitsData {
  const { habits, habitMarks } = store.get()
  return { habits, marks: habitMarks }
}

export class HabitsRepo {
  constructor(private readonly store: DataStore) {}

  /** A new habit starts today; editing one keeps the day it started. */
  save(draft: unknown): HabitsData {
    const input = isRecord(draft) ? draft : {}
    const existing = this.store.get().habits.find((habit) => habit.id === input.id)
    const habit = parseHabit({
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      createdOn: existing?.createdOn ?? toDateKey(new Date())
    })
    if (!habit) throw new Error('Invalid habit')
    this.store.update((data) => ({
      ...data,
      habits: sortHabits([...data.habits.filter((other) => other.id !== habit.id), habit])
    }))
    return habitsOf(this.store)
  }

  /** Deleting a habit also deletes its marks. */
  delete(id: unknown): HabitsData {
    this.store.update((data) => ({
      ...data,
      habits: data.habits.filter((habit) => habit.id !== id),
      habitMarks: data.habitMarks.filter((mark) => mark.habitId !== id)
    }))
    return habitsOf(this.store)
  }

  /** A tick or a cross on a day that has already come; null takes the mark away. */
  setMark(habitId: unknown, date: unknown, status: unknown): HabitsData {
    if (typeof habitId !== 'string' || typeof date !== 'string') throw new Error('Invalid mark')
    if (date > toDateKey(new Date())) throw new Error('Days to come cannot be marked')
    const id = habitMarkId(habitId, date)
    const habitIds = new Set(this.store.get().habits.map((habit) => habit.id))
    const mark = HABIT_MARK_STATUSES.some((option) => option === status)
      ? parseHabitMark({ id, habitId, date, status }, habitIds)
      : null
    if (status !== null && !mark) throw new Error('Invalid mark')

    this.store.update((data) => {
      const others = data.habitMarks.filter((existing) => existing.id !== id)
      return { ...data, habitMarks: mark ? sortHabitMarks([...others, mark]) : others }
    })
    return habitsOf(this.store)
  }
}
