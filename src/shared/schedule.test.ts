import { describe, expect, it } from 'vitest'
import { findOverlap, minutesToTime, sortSlots, timeToMinutes } from './schedule'
import type { ScheduleSlot } from './types'

const slot = (id: string, weekday: number, start: string, end: string): ScheduleSlot => ({
  id,
  weekday,
  start,
  end,
  label: id
})

describe('time conversion', () => {
  it('converts both ways', () => {
    expect(timeToMinutes('08:30')).toBe(510)
    expect(minutesToTime(510)).toBe('08:30')
    expect(minutesToTime(0)).toBe('00:00')
  })

  it('never goes past the end of the day', () => {
    expect(minutesToTime(24 * 60 + 30)).toBe('23:59')
  })
})

describe('findOverlap', () => {
  const schedule = [slot('maths', 1, '08:00', '09:00'), slot('english', 1, '09:00', '10:00')]

  it('finds a slot that shares time on the same day', () => {
    expect(findOverlap(schedule, { weekday: 1, start: '08:30', end: '09:30' })?.id).toBe('maths')
  })

  it('allows classes that only touch at the ends', () => {
    expect(findOverlap(schedule, { weekday: 1, start: '10:00', end: '11:00' })).toBeUndefined()
  })

  it('ignores other days', () => {
    expect(findOverlap(schedule, { weekday: 2, start: '08:00', end: '09:00' })).toBeUndefined()
  })

  it('ignores the slot being edited', () => {
    expect(
      findOverlap(schedule, { id: 'maths', weekday: 1, start: '08:00', end: '08:55' })
    ).toBeUndefined()
  })

  it('finds a slot fully inside the new one', () => {
    expect(findOverlap(schedule, { weekday: 1, start: '07:00', end: '12:00' })).toBeDefined()
  })
})

describe('sortSlots', () => {
  it('orders by day and then by start time', () => {
    const sorted = sortSlots([
      slot('c', 2, '08:00', '09:00'),
      slot('b', 1, '10:00', '11:00'),
      slot('a', 1, '08:00', '09:00')
    ])
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })
})
