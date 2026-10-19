import { daysUntil, toDateKey } from './dates'
import { compareItems, dueGroup, isOverdue } from './items'
import { timeToMinutes } from './schedule'
import type { AgendaData, AgendaItem, NotificationSettings } from './types'

/** When each reminder was last sent (ISO date), by key. Kept outside the backups. */
export type SentLog = Record<string, string>

export type PlannedNotification =
  | { kind: 'summary'; overdue: AgendaItem[]; today: AgendaItem[]; tomorrow: AgendaItem[] }
  | { kind: 'overdue'; items: AgendaItem[] }
  | { kind: 'exam'; exam: AgendaItem; daysLeft: number }

export interface NotificationPlan {
  notifications: PlannedNotification[]
  /** Keys to record as sent now, also for reminders that were due but had nothing to say */
  sentKeys: string[]
}

const HOUR_MS = 60 * 60 * 1000

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Quiet hours may wrap past midnight (22:00 to 08:00). Equal start and end means no quiet hours. */
export function isQuietTime(now: Date, start: string, end: string): boolean {
  const minutes = minutesOfDay(now)
  const from = timeToMinutes(start)
  const to = timeToMinutes(end)
  if (from === to) return false
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to
}

/** The key changes if the deadline moves, so a rescheduled item is reminded about again. */
export function overdueKey(item: AgendaItem): string {
  return `overdue:${item.id}:${item.date}`
}

/**
 * Decides which reminders to send at `now`. Pure function: the main process calls it every
 * minute and records `sentKeys`, so nothing is sent twice, not even after a restart.
 *
 * - Summary: once a day from `summaryTime` on (also later that day if the computer was off).
 * - Exams: on each of the chosen days before the exam, at the same time as the summary.
 * - Overdue homework and projects: as soon as they are late, then every `overdueRepeatHours`
 *   until they are done. Several late items go in a single notification.
 * - Nothing during quiet hours or while studying. Nothing is recorded either, so whatever
 *   was due goes out at the first check after the study block (at the break).
 */
export function planNotifications(
  now: Date,
  agenda: AgendaData,
  settings: NotificationSettings,
  log: SentLog,
  studying = false
): NotificationPlan {
  const plan: NotificationPlan = { notifications: [], sentKeys: [] }
  if (!settings.enabled || studying || isQuietTime(now, settings.quietStart, settings.quietEnd)) {
    return plan
  }

  const todayKey = toDateKey(now)
  const afterSummaryTime = minutesOfDay(now) >= timeToMinutes(settings.summaryTime)
  const pending = agenda.items.filter((item) => !item.done).sort(compareItems)
  const overdue = pending.filter((item) => isOverdue(item, now))

  let summarySent = false
  const summaryKey = `summary:${todayKey}`
  if (afterSummaryTime && !log[summaryKey]) {
    plan.notifications.push({
      kind: 'summary',
      overdue,
      today: pending.filter((item) => dueGroup(item, now) === 'today'),
      tomorrow: pending.filter((item) => dueGroup(item, now) === 'tomorrow')
    })
    plan.sentKeys.push(summaryKey)
    summarySent = true
  }

  if (afterSummaryTime) {
    for (const exam of pending.filter((item) => item.type === 'exam')) {
      const daysLeft = daysUntil(exam.date, now)
      const key = `exam:${exam.id}:${exam.date}:${daysLeft}`
      if (settings.examDaysBefore.includes(daysLeft) && !log[key]) {
        plan.notifications.push({ kind: 'exam', exam, daysLeft })
        plan.sentKeys.push(key)
      }
    }
  }

  const repeatMs = settings.overdueRepeatHours * HOUR_MS
  const needReminder = overdue.filter((item) => {
    const last = log[overdueKey(item)]
    if (!last) return true
    return repeatMs > 0 && now.getTime() - new Date(last).getTime() >= repeatMs
  })
  if (needReminder.length > 0) {
    // The summary already lists late work, so it counts as this round's reminder
    if (!summarySent) plan.notifications.push({ kind: 'overdue', items: needReminder })
    plan.sentKeys.push(...needReminder.map(overdueKey))
  }

  return plan
}

/** Drops log entries older than `days`, so the file does not grow forever. */
export function pruneLog(log: SentLog, now: Date, days = 60): SentLog {
  const limit = now.getTime() - days * 24 * HOUR_MS
  return Object.fromEntries(
    Object.entries(log).filter(([, sentAt]) => new Date(sentAt).getTime() >= limit)
  )
}
