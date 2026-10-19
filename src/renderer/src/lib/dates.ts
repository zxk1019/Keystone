import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  getISODay,
  parseISO,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { daysUntil } from '@shared/dates'

export { toDateKey } from '@shared/dates'

// Weeks start on Monday, as in Spain and China
const WEEK_OPTIONS = { weekStartsOn: 1 } as const

export function startOfSchoolWeek(date: Date): Date {
  return startOfWeek(date, WEEK_OPTIONS)
}

/** 1 = Monday ... 7 = Sunday, the same numbers used in the timetable */
export function isoWeekday(date: Date): number {
  return getISODay(date)
}

/** The dates of a week for the given weekdays, e.g. [1, 2, 3, 4, 5] for Monday to Friday. */
export function datesOfWeek(weekStart: Date, weekdays: number[]): Date[] {
  return weekdays.map((weekday) => addDays(weekStart, weekday - 1))
}

/** Full weeks (Monday to Sunday) that cover the month, including days of the months around it. */
export function monthGrid(month: Date): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(month), WEEK_OPTIONS)
  })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

function capitalize(text: string, language: string): string {
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1)
}

/** "Lun" / "Mon" / "周一" for weekday 1. */
export function weekdayName(weekday: number, language: string, style: 'short' | 'long'): string {
  // 1 January 2024 was a Monday, so day N of that month is ISO weekday N
  const date = new Date(2024, 0, weekday)
  return capitalize(new Intl.DateTimeFormat(language, { weekday: style }).format(date), language)
}

/** "19–23 oct 2026" / "Oct 19 – 23, 2026" / "2026年10月19日 – 10月23日" */
export function formatDateRange(start: Date, end: Date, language: string): string {
  if (language.startsWith('zh')) {
    // Chinese date ranges come out as "2026/10/19 – 2026/10/23", so they are built by hand
    const full = new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const short = new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric' })
    const sameYear = start.getFullYear() === end.getFullYear()
    return `${full.format(start)} – ${(sameYear ? short : full).format(end)}`
  }
  const formatter = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return capitalize(formatter.formatRange(start, end), language)
}

/** "Octubre de 2026" / "October 2026" / "2026年10月" */
export function formatMonth(month: Date, language: string): string {
  const formatter = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' })
  return capitalize(formatter.format(month), language)
}

/** "Lunes, 19 de octubre" / "Monday, October 19" / "10月19日星期一" */
export function formatLongDate(date: Date, language: string): string {
  const formatter = new Intl.DateTimeFormat(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  return capitalize(formatter.format(date), language)
}

/** "Ayer" / "Hoy" / "Mañana" when close, otherwise "Vie, 16 oct" (with the year if it is not this one). */
export function formatDueDate(dateKey: string, today: Date, language: string): string {
  const days = daysUntil(dateKey, today)
  if (Math.abs(days) <= 1) {
    const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
    return capitalize(relative.format(days, 'day'), language)
  }
  const date = parseISO(dateKey)
  const formatter = new Intl.DateTimeFormat(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  })
  return capitalize(formatter.format(date), language)
}

/** "Hoy" / "Mañana" / "Dentro de 3 días" */
export function formatCountdown(dateKey: string, today: Date, language: string): string {
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  return capitalize(relative.format(daysUntil(dateKey, today), 'day'), language)
}
