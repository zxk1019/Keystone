import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISODay,
  startOfMonth,
  startOfWeek
} from 'date-fns'

// Weeks start on Monday, as in Spain and China
const WEEK_OPTIONS = { weekStartsOn: 1 } as const

/** "2026-10-19", the format dates are stored in */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

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
