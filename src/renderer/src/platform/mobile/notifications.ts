import {
  LocalNotifications,
  type ActionPerformed,
  type LocalNotificationSchema
} from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import type { NavigationTarget } from '@shared/api'
import { planAhead, pruneLog, type SentLog } from '@shared/notifications'
import { advance, type TimerState } from '@shared/studyTimer'
import type { Settings } from '@shared/types'
import { isRecord } from '@shared/validation'
import { agendaOf } from '@core/data/agendaRepos'
import type { DataStore } from '@core/data/dataStore'
import type { Translate } from '@core/i18n'
import { describeNotification, type NotificationContent } from '@core/notificationText'
import { phaseNotification } from '@core/studyText'

/*
 * Reminders on the phone. Android does not keep the app running, so instead of checking every
 * minute like the PC, the reminders of the coming days are handed to the system in advance
 * (planAhead) and planned again whenever something changes or the app opens.
 */

const STATE_KEY = 'notifications'
/** Ids 1 to 999 are reminders, 1000+ the study timer and the test */
const FIRST_REMINDER_ID = 1
const STUDY_IDS = [1001, 1002]
const TEST_ID = 1100
const REMINDERS_CHANNEL = 'reminders'
const STUDY_CHANNEL = 'study'
const OVERDUE_ACTIONS = 'overdue'
const DONE_ACTION = 'done'
/** White graduation cap in android/app/src/main/res/drawable */
const SMALL_ICON = 'ic_stat_mi_estudio'
/** Several changes in a row are planned once */
const PLAN_DELAY_MS = 1000

/** What was handed to the system last time, to know later which reminders already went out. */
interface SavedState {
  log: SentLog
  scheduled: { key: string; at: string }[]
}

interface MobileNotifierDeps {
  store: DataStore
  settings: () => Settings
  studyTimer: () => TimerState
  translate: () => Translate
  /** The "Done" button of a reminder about late work */
  onDone: (itemId: string) => void
  /** A notification was tapped */
  onOpen: (target: NavigationTarget) => void
}

function parseState(text: string | null): SavedState {
  try {
    const value: unknown = text ? JSON.parse(text) : null
    if (!isRecord(value) || !isRecord(value.log) || !Array.isArray(value.scheduled)) {
      return { log: {}, scheduled: [] }
    }
    const log = Object.fromEntries(
      Object.entries(value.log).filter((entry): entry is [string, string] => {
        return typeof entry[1] === 'string'
      })
    )
    const scheduled = value.scheduled.filter(
      (entry): entry is { key: string; at: string } =>
        isRecord(entry) && typeof entry.key === 'string' && typeof entry.at === 'string'
    )
    return { log, scheduled }
  } catch {
    // A broken state only means a reminder may come twice
    return { log: {}, scheduled: [] }
  }
}

function isTarget(value: unknown): value is NavigationTarget {
  return isRecord(value) && typeof value.section === 'string'
}

export class MobileNotifier {
  private timer: ReturnType<typeof setTimeout> | null = null
  private exact = false
  private planning: Promise<void> = Promise.resolve()

  constructor(private readonly deps: MobileNotifierDeps) {}

  /** Never fails: without notifications the rest of the app keeps working. */
  async start(): Promise<void> {
    try {
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) =>
        this.handleAction(action)
      )
      // Android 13+ asks the user once; without permission the reminders are simply not shown
      const permission = await LocalNotifications.checkPermissions()
      if (permission.display !== 'granted' && permission.display !== 'denied') {
        await LocalNotifications.requestPermissions()
      }
      await this.prepareChannels()
      await this.plan()
    } catch (error) {
      logError(error)
    }
  }

  /** Plans again a moment later: after a change, a sync or when the app opens. */
  planSoon(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.planning = this.planning.then(() => this.plan()).catch(logError)
    }, PLAN_DELAY_MS)
  }

  /** Channel names and the "Done" button are in the app language. */
  async languageChanged(): Promise<void> {
    await this.prepareChannels().catch(logError)
    this.planSoon()
  }

  async sendTest(): Promise<void> {
    const t = this.deps.translate()
    await this.schedule([
      this.toNotification(TEST_ID, new Date(Date.now() + 1000), REMINDERS_CHANNEL, {
        title: t('notify.testTitle'),
        body: t('notify.testBody'),
        target: { section: 'today' }
      })
    ])
  }

  /**
   * While the app is in the background, the end of the study block and of the break come as
   * notifications; in front, the chime is enough. Null cancels them (the app came back).
   */
  async studyInBackground(timer: TimerState | null): Promise<void> {
    try {
      await this.scheduleStudy(timer)
    } catch (error) {
      logError(error)
    }
  }

  private async scheduleStudy(timer: TimerState | null): Promise<void> {
    await LocalNotifications.cancel({ notifications: STUDY_IDS.map((id) => ({ id })) })
    if (!timer) return
    const t = this.deps.translate()
    const durations = this.deps.settings().study
    const notifications: LocalNotificationSchema[] = []
    let state = timer
    for (const id of STUDY_IDS) {
      if (state.status !== 'running' || state.endsAt === null) break
      const endsAt = state.endsAt
      const next = advance(state, endsAt, durations)
      const [event] = next.events
      if (!event) break
      const content = phaseNotification(event, next.state, t)
      notifications.push(this.toNotification(id, new Date(endsAt), STUDY_CHANNEL, content))
      state = next.state
    }
    await this.schedule(notifications)
  }

  private async plan(): Promise<void> {
    const now = new Date()
    const saved = parseState((await Preferences.get({ key: STATE_KEY })).value)
    // Whatever was due by now has been shown: it counts as sent, as on the PC
    const delivered = saved.scheduled.filter((entry) => Date.parse(entry.at) <= now.getTime())
    const log = pruneLog(
      { ...saved.log, ...Object.fromEntries(delivered.map((entry) => [entry.key, entry.at])) },
      now
    )

    const settings = this.deps.settings()
    const timer = this.deps.studyTimer()
    const studyingUntil =
      timer.status === 'running' && timer.phase === 'focus' && timer.endsAt !== null
        ? timer.endsAt
        : undefined
    const { store } = this.deps
    const ahead = planAhead(now, agendaOf(store), settings.notifications, log, { studyingUntil })

    const t = this.deps.translate()
    const subjects = new Map(store.get().subjects.map((subject) => [subject.id, subject]))
    const notifications: LocalNotificationSchema[] = []
    for (const reminder of ahead.reminders) {
      const content = describeNotification(reminder.notification, t, settings.language, subjects)
      if (!content) continue
      // Due right now: a second later, so the system does not consider it in the past
      const at = new Date(Math.max(reminder.at.getTime(), now.getTime() + 1000))
      const id = FIRST_REMINDER_ID + notifications.length
      notifications.push(this.toNotification(id, at, REMINDERS_CHANNEL, content))
    }

    const pending = await LocalNotifications.getPending()
    const oldReminders = pending.notifications.filter((n) => n.id < STUDY_IDS[0])
    if (oldReminders.length > 0) {
      await LocalNotifications.cancel({ notifications: oldReminders.map(({ id }) => ({ id })) })
    }
    await this.schedule(notifications)
    const state: SavedState = { log, scheduled: ahead.sent }
    await Preferences.set({ key: STATE_KEY, value: JSON.stringify(state) })
  }

  private toNotification(
    id: number,
    at: Date,
    channelId: string,
    content: NotificationContent
  ): LocalNotificationSchema {
    return {
      id,
      title: content.title,
      body: content.body,
      // Shown when the notification is expanded: the lists have several lines
      largeBody: content.body,
      schedule: { at, allowWhileIdle: true },
      channelId,
      smallIcon: SMALL_ICON,
      actionTypeId: content.doneItemId ? OVERDUE_ACTIONS : undefined,
      extra: { target: content.target, doneItemId: content.doneItemId },
      // Without the "exact alarms" permission, Android may deliver them a little late
      isExactNotification: this.exact,
      autoCancel: true
    }
  }

  private async schedule(notifications: LocalNotificationSchema[]): Promise<void> {
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications })
  }

  private async prepareChannels(): Promise<void> {
    const t = this.deps.translate()
    await LocalNotifications.createChannel({
      id: REMINDERS_CHANNEL,
      name: t('notify.channelReminders'),
      importance: 4
    })
    await LocalNotifications.createChannel({
      id: STUDY_CHANNEL,
      name: t('notify.channelStudy'),
      importance: 4
    })
    await LocalNotifications.registerActionTypes({
      types: [{ id: OVERDUE_ACTIONS, actions: [{ id: DONE_ACTION, title: t('notify.markDone') }] }]
    })
    const exact = await LocalNotifications.checkExactNotificationSetting()
    this.exact = exact.exact_alarm === 'granted'
  }

  private handleAction(action: ActionPerformed): void {
    const extra: unknown = action.notification.extra
    if (!isRecord(extra)) return
    if (action.actionId === DONE_ACTION && typeof extra.doneItemId === 'string') {
      this.deps.onDone(extra.doneItemId)
    } else if (isTarget(extra.target)) {
      this.deps.onOpen(extra.target)
    }
  }
}

function logError(error: unknown): void {
  console.error('[avisos] No se han podido programar los avisos', error)
}
