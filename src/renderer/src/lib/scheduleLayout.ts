import { minutesToTime, timeToMinutes } from '@shared/schedule'
import type { AgendaItem, AgendaItemType, ScheduleSlot, Subject } from '@shared/types'

export const WEEKDAYS = [1, 2, 3, 4, 5]
export const WEEKEND = [6, 7]

/** Hours shown when there are no classes yet */
const DEFAULT_HOURS = { start: 8, end: 15 }

/**
 * The hours the week grid shows: from the first class to the last one, rounded to whole hours.
 * While editing there is one extra hour before and after, to have room to add classes.
 */
export function visibleHours(
  slots: ScheduleSlot[],
  editing: boolean
): { start: number; end: number } {
  let start = DEFAULT_HOURS.start
  let end = DEFAULT_HOURS.end
  if (slots.length > 0) {
    start = Math.floor(Math.min(...slots.map((slot) => timeToMinutes(slot.start))) / 60)
    end = Math.ceil(Math.max(...slots.map((slot) => timeToMinutes(slot.end))) / 60)
  }
  return editing ? { start: Math.max(0, start - 1), end: Math.min(24, end + 1) } : { start, end }
}

/**
 * Monday to Friday, plus Saturday and Sunday only when something happens on them:
 * a class in the timetable or, for a real week, an item on one of those dates.
 */
export function visibleWeekdays(slots: ScheduleSlot[], weekendItems: AgendaItem[] = []): number[] {
  const usesWeekend =
    slots.some((slot) => WEEKEND.includes(slot.weekday)) || weekendItems.length > 0
  return usesWeekend ? [...WEEKDAYS, ...WEEKEND] : WEEKDAYS
}

// Most important first when a day has several items
const TYPE_ORDER: Record<AgendaItemType, number> = { exam: 0, project: 1, homework: 2, event: 3 }

/** Groups items by their "YYYY-MM-DD" date: pending before done, then exams, projects, homework, events. */
export function itemsByDate(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const groups = new Map<string, AgendaItem[]>()
  for (const item of items) {
    const list = groups.get(item.date) ?? []
    list.push(item)
    groups.set(item.date, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => Number(a.done) - Number(b.done) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type])
  }
  return groups
}

/** What a slot shows: its subject's name for a class, its label for a break. */
export function slotTitle(slot: ScheduleSlot, subjects: Map<string, Subject>): string {
  return (slot.subjectId && subjects.get(slot.subjectId)?.name) || slot.label || ''
}

/** Where a new class on that day most likely starts: when the last one ends, or at 08:00. */
export function nextFreeStart(slots: ScheduleSlot[], weekday: number): string {
  const ends = slots
    .filter((slot) => slot.weekday === weekday)
    .map((slot) => timeToMinutes(slot.end))
  return ends.length > 0 ? minutesToTime(Math.max(...ends)) : '08:00'
}
