import { describe, expect, it } from 'vitest'
import type { AgendaItem, ScheduleSlot } from '@shared/types'
import { itemsByDate, nextFreeStart, visibleHours, visibleWeekdays } from './scheduleLayout'

const slot = (weekday: number, start: string, end: string): ScheduleSlot => ({
  id: `${weekday}-${start}`,
  weekday,
  start,
  end,
  label: 'x'
})

const item = (id: string, type: AgendaItem['type'], done = false): AgendaItem => ({
  id,
  type,
  title: id,
  date: '2026-10-20',
  priority: 'medium',
  done
})

describe('visibleHours', () => {
  it('shows 8:00 to 15:00 when there are no classes', () => {
    expect(visibleHours([], false)).toEqual({ start: 8, end: 15 })
  })

  it('rounds the first and last class out to whole hours', () => {
    const schedule = [slot(1, '08:30', '09:25'), slot(2, '13:30', '14:20')]
    expect(visibleHours(schedule, false)).toEqual({ start: 8, end: 15 })
  })

  it('adds an hour on each side while editing', () => {
    expect(visibleHours([slot(1, '08:00', '14:00')], true)).toEqual({ start: 7, end: 15 })
  })
})

describe('visibleWeekdays', () => {
  it('shows Monday to Friday by default', () => {
    expect(visibleWeekdays([slot(1, '08:00', '09:00')])).toEqual([1, 2, 3, 4, 5])
  })

  it('adds the weekend when something happens on it', () => {
    expect(visibleWeekdays([slot(6, '10:00', '11:00')])).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(visibleWeekdays([], [item('party', 'event')])).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('itemsByDate', () => {
  it('puts pending items first and exams before the rest', () => {
    const groups = itemsByDate([
      item('event', 'event'),
      item('done-exam', 'exam', true),
      item('homework', 'homework'),
      item('exam', 'exam')
    ])
    expect(groups.get('2026-10-20')?.map((i) => i.id)).toEqual([
      'exam',
      'homework',
      'event',
      'done-exam'
    ])
  })
})

describe('nextFreeStart', () => {
  it('starts where the last class of the day ends', () => {
    expect(nextFreeStart([slot(1, '08:00', '08:55'), slot(1, '08:55', '09:50')], 1)).toBe('09:50')
    expect(nextFreeStart([slot(1, '08:00', '08:55')], 2)).toBe('08:00')
  })
})
