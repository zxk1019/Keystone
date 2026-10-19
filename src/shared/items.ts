import { addDays, endOfWeek } from 'date-fns'
import { toDateKey } from './dates'
import type { AgendaItem, AgendaItemType, Priority } from './types'

/** Types that have a deadline and can therefore be late. Exams and events simply pass. */
export const DEADLINE_TYPES: AgendaItemType[] = ['homework', 'project']

/** How many days ahead "upcoming exams" looks */
export const UPCOMING_EXAM_DAYS = 30

export type DueGroup = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'past'

export function isOverdue(item: AgendaItem, today: Date): boolean {
  return !item.done && DEADLINE_TYPES.includes(item.type) && item.date < toDateKey(today)
}

/** When an item is due compared to today. Past exams and events are 'past', never 'overdue'. */
export function dueGroup(item: AgendaItem, today: Date): DueGroup {
  const todayKey = toDateKey(today)
  if (item.date < todayKey) return isOverdue(item, today) ? 'overdue' : 'past'
  if (item.date === todayKey) return 'today'
  if (item.date === toDateKey(addDays(today, 1))) return 'tomorrow'
  if (item.date <= toDateKey(endOfWeek(today, { weekStartsOn: 1 }))) return 'thisWeek'
  return 'later'
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

/** By date, then high priority first, then by time (items without a time go first). */
export function compareItems(a: AgendaItem, b: AgendaItem): number {
  return (
    a.date.localeCompare(b.date) ||
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    (a.time ?? '').localeCompare(b.time ?? '')
  )
}

/** What still needs doing soon: late deadlines plus anything (except exams) due today or tomorrow. */
export function urgentItems(items: AgendaItem[], today: Date): AgendaItem[] {
  return items
    .filter((item) => !item.done && item.type !== 'exam')
    .filter((item) => ['overdue', 'today', 'tomorrow'].includes(dueGroup(item, today)))
    .sort(compareItems)
}

/** Exams from today up to UPCOMING_EXAM_DAYS ahead that are not marked as done. */
export function upcomingExams(items: AgendaItem[], today: Date): AgendaItem[] {
  const from = toDateKey(today)
  const to = toDateKey(addDays(today, UPCOMING_EXAM_DAYS))
  return items
    .filter((item) => item.type === 'exam' && !item.done && item.date >= from && item.date <= to)
    .sort(compareItems)
}
