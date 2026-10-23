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

/** A reminder of the coming days and the moment it should appear. */
export interface ScheduledReminder {
  at: Date
  notification: PlannedNotification
}

export interface AheadPlan {
  reminders: ScheduledReminder[]
  /** The keys these reminders record as sent, and when, to add to the log once they are out */
  sent: { key: string; at: string }[]
}

export interface AheadOptions {
  /** A study block is running until then (ms): reminders wait for the break, as on the PC */
  studyingUntil?: number
  /** How many days ahead */
  days?: number
  /** At most this many reminders, the earliest ones */
  max?: number
}

/** The moments of a day when something can become due: midnight, the summary, end of quiet. */
function dailyMoments(day: Date, settings: NotificationSettings): Date[] {
  return ['00:00', settings.summaryTime, settings.quietEnd].map((time) => {
    const minutes = timeToMinutes(time)
    return new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      Math.floor(minutes / 60),
      minutes % 60
    )
  })
}

/**
 * The reminders of the coming days, for a device where the app is not running all the time:
 * the phone hands them to the system in advance. It asks `planNotifications` at every moment
 * something can become due, so the result is what the PC would send checking every minute,
 * assuming nothing changes meanwhile (the app plans again after any change).
 */
export function planAhead(
  now: Date,
  agenda: AgendaData,
  settings: NotificationSettings,
  log: SentLog,
  { studyingUntil, days = 7, max = 60 }: AheadOptions = {}
): AheadPlan {
  const plan: AheadPlan = { reminders: [], sent: [] }
  if (!settings.enabled) return plan

  const end = now.getTime() + days * 24 * HOUR_MS
  const repeatMs = settings.overdueRepeatHours * HOUR_MS
  // Moments to check, in ms. Nothing can become due between them: reminders start at midnight
  // (late work) or at the summary time, wait for the end of quiet hours or of the study block,
  // and late work comes back every `overdueRepeatHours`.
  const moments = new Set<number>([now.getTime()])
  if (studyingUntil !== undefined) moments.add(studyingUntil)
  for (let day = 0; day <= days + 1; day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day)
    for (const moment of dailyMoments(date, settings)) moments.add(moment.getTime())
  }
  const addRepeat = (sentAt: number): void => {
    if (repeatMs > 0) moments.add(sentAt + repeatMs)
  }
  for (const [key, sentAt] of Object.entries(log)) {
    if (key.startsWith('overdue:')) addRepeat(new Date(sentAt).getTime())
  }

  const simulatedLog = { ...log }
  const done = new Set<number>()
  for (;;) {
    const pending = [...moments].filter(
      (time) => time >= now.getTime() && time <= end && !done.has(time)
    )
    if (pending.length === 0 || plan.reminders.length >= max) break
    const time = Math.min(...pending)
    done.add(time)

    const date = new Date(time)
    const studying = studyingUntil !== undefined && time < studyingUntil
    const step = planNotifications(date, agenda, settings, simulatedLog, studying)
    if (step.sentKeys.length === 0) continue
    for (const notification of step.notifications) {
      if (plan.reminders.length < max) plan.reminders.push({ at: date, notification })
    }
    const sentAt = date.toISOString()
    for (const key of step.sentKeys) {
      simulatedLog[key] = sentAt
      plan.sent.push({ key, at: sentAt })
      if (key.startsWith('overdue:')) addRepeat(time)
    }
  }
  return plan
}
