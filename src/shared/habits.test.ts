import { describe, expect, it } from 'vitest'
import { canMark, habitStreak, marksByHabit, nextMarkStatus } from './habits'
import type { Habit, HabitMarkStatus } from './types'

// Monday 26 October 2026
const today = new Date(2026, 9, 26, 18, 0)
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'read',
    name: 'Leer',
    color: 'teal',
    weekdays: EVERY_DAY,
    createdOn: '2026-10-20',
    ...overrides
  }
}

/** marks('done', 20, 21) → 20 and 21 October marked as done */
function marks(...entries: [HabitMarkStatus, ...number[]][]): Map<string, HabitMarkStatus> {
  const result = new Map<string, HabitMarkStatus>()
  for (const [status, ...days] of entries) {
    for (const day of days) result.set(`2026-10-${String(day).padStart(2, '0')}`, status)
  }
  return result
}

describe('habit streaks', () => {
  it('counts the days in a row with a tick; today without a mark does not break it', () => {
    expect(habitStreak(habit(), marks(['done', 20, 21, 22, 23, 24, 25]), today)).toEqual({
      current: 6,
      best: 6
    })
    expect(habitStreak(habit(), marks(['done', 20, 21, 22, 23, 24, 25, 26]), today).current).toBe(7)
  })

  it('starts again after a cross, and keeps the record', () => {
    const result = habitStreak(
      habit(),
      marks(['done', 20, 21, 22, 23, 24, 25], ['missed', 26]),
      today
    )
    expect(result).toEqual({ current: 0, best: 6 })
  })

  it('treats a past day without a mark as missed', () => {
    expect(habitStreak(habit(), marks(['done', 20, 21, 23, 24, 25]), today)).toEqual({
      current: 3,
      best: 3
    })
  })

  it('skips the days the habit is not due', () => {
    // Monday, Wednesday and Friday, from Monday 12 October
    const gym = habit({ weekdays: [1, 3, 5], createdOn: '2026-10-12' })
    expect(habitStreak(gym, marks(['done', 12, 14, 16, 19, 21, 23]), today)).toEqual({
      current: 6,
      best: 6
    })
    // A Tuesday with a cross does not count either
    expect(
      habitStreak(gym, marks(['done', 12, 14, 16, 19, 21, 23], ['missed', 20]), today).current
    ).toBe(6)
  })

  it('counts days filled in from before the habit was created', () => {
    const late = habit({ createdOn: '2026-10-25' })
    expect(habitStreak(late, marks(['done', 22, 23, 24, 25]), today).current).toBe(4)
  })

  it('has no streak for a habit that starts in the future', () => {
    expect(habitStreak(habit({ createdOn: '2026-11-02' }), new Map(), today)).toEqual({
      current: 0,
      best: 0
    })
  })
})

describe('marking days', () => {
  it('goes from nothing to tick to cross and back', () => {
    expect(nextMarkStatus(undefined)).toBe('done')
    expect(nextMarkStatus('done')).toBe('missed')
    expect(nextMarkStatus('missed')).toBeNull()
  })

  it('only marks days that have come and on which the habit is due', () => {
    const weekdays = habit({ weekdays: [1, 2, 3, 4, 5] })
    expect(canMark(weekdays, today, today)).toBe(true)
    expect(canMark(weekdays, new Date(2026, 9, 27), today)).toBe(false)
    // Sunday 25 October
    expect(canMark(weekdays, new Date(2026, 9, 25), today)).toBe(false)
  })

  it('groups the marks by habit and day', () => {
    const grouped = marksByHabit([
      { id: 'read/2026-10-25', habitId: 'read', date: '2026-10-25', status: 'done' },
      { id: 'gym/2026-10-25', habitId: 'gym', date: '2026-10-25', status: 'missed' }
    ])
    expect(grouped.get('read')?.get('2026-10-25')).toBe('done')
    expect(grouped.get('gym')?.get('2026-10-25')).toBe('missed')
  })
})
