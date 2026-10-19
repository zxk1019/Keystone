import { describe, expect, it } from 'vitest'
import type { AgendaItem } from '@shared/types'
import { buildSections } from './taskSections'

// Wednesday 21 October 2026
const today = new Date(2026, 9, 21)

const item = (id: string, type: AgendaItem['type'], date: string, done = false): AgendaItem => ({
  id,
  type,
  title: id,
  date,
  priority: 'medium',
  done
})

const items = [
  item('late', 'homework', '2026-10-19'),
  item('past-exam', 'exam', '2026-10-19'),
  item('today', 'homework', '2026-10-21'),
  item('later', 'project', '2026-11-03'),
  item('done-old', 'homework', '2026-10-10', true),
  item('done-new', 'homework', '2026-10-20', true)
]

const summary = (status: Parameters<typeof buildSections>[1]): string[] =>
  buildSections(items, status, today).map(
    (section) => `${section.key}: ${section.items.map((i) => i.id).join(', ')}`
  )

describe('buildSections', () => {
  it('shows pending work grouped by when it is due, without past exams', () => {
    expect(summary('pending')).toEqual(['overdue: late', 'today: today', 'later: later'])
  })

  it('shows only late work for "overdue"', () => {
    expect(summary('overdue')).toEqual(['overdue: late'])
  })

  it('shows finished work newest first', () => {
    expect(summary('done')).toEqual(['done: done-new, done-old'])
  })

  it('shows everything for "all", with past exams and finished work at the end', () => {
    expect(summary('all')).toEqual([
      'overdue: late',
      'today: today',
      'later: later',
      'past: past-exam',
      'done: done-new, done-old'
    ])
  })
})
