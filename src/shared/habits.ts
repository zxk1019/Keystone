import { addDays, getISODay, parseISO } from 'date-fns'
import { toDateKey } from './dates'
import type { Habit, HabitMark, HabitMarkStatus } from './types'

/*
 * Habits: each day a habit is due gets a green tick (done) or a red cross (missed). The streak
 * is the number of due days in a row with a tick, and the record the longest streak ever.
 */

export function habitMarkId(habitId: string, date: string): string {
  return `${habitId}/${date}`
}

/** Alphabetical, so the PC and the phone show them in the same order. */
export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id)
  )
}

export function sortHabitMarks(marks: HabitMark[]): HabitMark[] {
  return [...marks].sort((a, b) => a.id.localeCompare(b.id))
}

export function isDue(habit: Habit, date: Date): boolean {
  return habit.weekdays.includes(getISODay(date))
}

/** Only days that have already come, and on which the habit is due, can be marked. */
export function canMark(habit: Habit, date: Date, today: Date): boolean {
  return toDateKey(date) <= toDateKey(today) && isDue(habit, date)
}

/** Each click moves on: nothing → tick → cross → nothing. */
export function nextMarkStatus(current: HabitMarkStatus | undefined): HabitMarkStatus | null {
  if (current === undefined) return 'done'
  return current === 'done' ? 'missed' : null
}

/** The marks of each habit, by date: marks.get(habitId)?.get('2026-10-26') */
export function marksByHabit(marks: HabitMark[]): Map<string, Map<string, HabitMarkStatus>> {
  const result = new Map<string, Map<string, HabitMarkStatus>>()
  for (const mark of marks) {
    const days = result.get(mark.habitId) ?? new Map<string, HabitMarkStatus>()
    days.set(mark.date, mark.status)
    result.set(mark.habitId, days)
  }
  return result
}

export interface HabitStreak {
  /** Due days in a row with a tick, up to today */
  current: number
  /** The longest streak ever */
  best: number
}

/**
 * A cross, or a due day left without a mark, breaks the streak. Today without a mark does not:
 * there is still time. Days the habit is not due neither count nor break it. Counting starts the
 * day the habit was created, or on the first marked day if earlier days were filled in later.
 */
export function habitStreak(
  habit: Habit,
  marks: Map<string, HabitMarkStatus>,
  today: Date
): HabitStreak {
  const todayKey = toDateKey(today)
  const first = [habit.createdOn, ...marks.keys()].sort()[0]
  let current = 0
  let best = 0
  for (let day = parseISO(first); toDateKey(day) <= todayKey; day = addDays(day, 1)) {
    if (!isDue(habit, day)) continue
    const key = toDateKey(day)
    const status = marks.get(key)
    if (status === 'done') {
      current += 1
      best = Math.max(best, current)
    } else if (status === 'missed' || key !== todayKey) {
      current = 0
    }
  }
  return { current, best }
}
