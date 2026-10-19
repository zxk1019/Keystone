import { describe, expect, it } from 'vitest'
import { compareItems, dueGroup, isOverdue, upcomingExams, urgentItems } from './items'
import type { AgendaItem } from './types'

// Wednesday 21 October 2026; the week runs from Monday 19 to Sunday 25
const today = new Date(2026, 9, 21, 10, 0)

const item = (
  id: string,
  type: AgendaItem['type'],
  date: string,
  extra: Partial<AgendaItem> = {}
): AgendaItem => ({ id, type, title: id, date, priority: 'medium', done: false, ...extra })

describe('isOverdue', () => {
  it('is true for unfinished homework and projects from before today', () => {
    expect(isOverdue(item('h', 'homework', '2026-10-20'), today)).toBe(true)
    expect(isOverdue(item('p', 'project', '2026-10-01'), today)).toBe(true)
  })

  it('is false when done, due today, or for exams and events', () => {
    expect(isOverdue(item('h', 'homework', '2026-10-20', { done: true }), today)).toBe(false)
    expect(isOverdue(item('h', 'homework', '2026-10-21'), today)).toBe(false)
    expect(isOverdue(item('e', 'exam', '2026-10-20'), today)).toBe(false)
    expect(isOverdue(item('v', 'event', '2026-10-20'), today)).toBe(false)
  })
})

describe('dueGroup', () => {
  it('sorts items into when they are due', () => {
    expect(dueGroup(item('a', 'homework', '2026-10-19'), today)).toBe('overdue')
    expect(dueGroup(item('b', 'exam', '2026-10-19'), today)).toBe('past')
    expect(dueGroup(item('c', 'homework', '2026-10-21'), today)).toBe('today')
    expect(dueGroup(item('d', 'homework', '2026-10-22'), today)).toBe('tomorrow')
    expect(dueGroup(item('e', 'homework', '2026-10-25'), today)).toBe('thisWeek')
    expect(dueGroup(item('f', 'homework', '2026-10-26'), today)).toBe('later')
  })
})

describe('compareItems', () => {
  it('orders by date, then high priority first, then by time', () => {
    const sorted = [
      item('late-low', 'homework', '2026-10-22', { priority: 'low' }),
      item('soon-low', 'homework', '2026-10-21', { priority: 'low' }),
      item('soon-high-9', 'homework', '2026-10-21', { priority: 'high', time: '09:00' }),
      item('soon-high', 'homework', '2026-10-21', { priority: 'high' })
    ].sort(compareItems)
    expect(sorted.map((i) => i.id)).toEqual(['soon-high', 'soon-high-9', 'soon-low', 'late-low'])
  })
})

describe('urgentItems', () => {
  it('lists what is late or due today or tomorrow, except exams and finished items', () => {
    const urgent = urgentItems(
      [
        item('late', 'homework', '2026-10-15'),
        item('today', 'project', '2026-10-21'),
        item('party', 'event', '2026-10-22'),
        item('exam', 'exam', '2026-10-22'),
        item('done', 'homework', '2026-10-21', { done: true }),
        item('later', 'homework', '2026-10-23'),
        item('old-event', 'event', '2026-10-15')
      ],
      today
    )
    expect(urgent.map((i) => i.id)).toEqual(['late', 'today', 'party'])
  })
})

describe('upcomingExams', () => {
  it('lists pending exams from today up to 30 days ahead', () => {
    const exams = upcomingExams(
      [
        item('far', 'exam', '2026-11-21'),
        item('soon', 'exam', '2026-10-23'),
        item('today', 'exam', '2026-10-21'),
        item('past', 'exam', '2026-10-20'),
        item('done', 'exam', '2026-10-24', { done: true }),
        item('limit', 'exam', '2026-11-20'),
        item('homework', 'homework', '2026-10-22')
      ],
      today
    )
    expect(exams.map((i) => i.id)).toEqual(['today', 'soon', 'limit'])
  })
})
