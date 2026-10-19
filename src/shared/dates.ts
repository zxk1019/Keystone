import { differenceInCalendarDays, format, parseISO } from 'date-fns'

/** "2026-10-19", the format dates are stored in. Plain string comparison sorts them by date. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Calendar days from `today` to the stored date: 0 today, 1 tomorrow, -1 yesterday. */
export function daysUntil(dateKey: string, today: Date): number {
  return differenceInCalendarDays(parseISO(dateKey), today)
}
