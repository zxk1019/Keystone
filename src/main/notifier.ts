import { Notification } from 'electron'
import { pathToFileURL } from 'url'
import type { NavigationTarget } from '@shared/api'
import { planNotifications } from '@shared/notifications'
import icon from '../../resources/icon.png?asset'
import { agendaOf } from './data/agendaRepos'
import type { DataStore } from './data/dataStore'
import type { NotificationLog } from './data/notificationLog'
import type { SettingsRepo } from './data/settingsRepo'
import { createTranslator } from './i18n'
import { describeNotification, type NotificationContent } from './notificationText'
import { toastXml } from './toastXml'

const CHECK_EVERY_MS = 60_000

interface NotifierDeps {
  store: DataStore
  settings: SettingsRepo
  log: NotificationLog
  /** While studying, reminders wait for the break */
  isStudying: () => boolean
  /** Opens the app on what the notification is about */
  open: (target: NavigationTarget) => void
  /**
   * Windows toasts written in XML, with a "Done" button. Their clicks arrive as miestudio://
   * links, which only work in the installed app (it registers the link with Windows).
   */
  richToasts: boolean
}

/** Every minute, asks the planner what is due and shows it as Windows notifications. */
export class Notifier {
  // Electron loses the click handler of a notification that gets garbage collected,
  // so each one is kept here until it is clicked or closed
  private readonly shown = new Set<Notification>()

  constructor(private readonly deps: NotifierDeps) {}

  start(): void {
    this.check()
    setInterval(() => this.check(), CHECK_EVERY_MS)
  }

  check(now = new Date()): void {
    if (!Notification.isSupported()) return
    const { store, settings, log } = this.deps
    const current = settings.get()
    const plan = planNotifications(
      now,
      agendaOf(store),
      current.notifications,
      log.get(),
      this.deps.isStudying()
    )
    if (plan.sentKeys.length === 0) return

    const t = createTranslator(current.language)
    const subjects = new Map(store.get().subjects.map((subject) => [subject.id, subject]))
    for (const planned of plan.notifications) {
      const content = describeNotification(planned, t, current.language, subjects)
      if (content) this.show(content)
    }
    log.record(plan.sentKeys, now)
  }

  sendTest(): void {
    const t = createTranslator(this.deps.settings.get().language)
    this.show({
      title: t('notify.testTitle'),
      body: t('notify.testBody'),
      target: { section: 'today' }
    })
  }

  /** Shows a notification right away, outside the reminder planning (e.g. the study timer). */
  show(content: NotificationContent): void {
    const { title, body, target } = content
    const notification = this.deps.richToasts
      ? new Notification({
          toastXml: toastXml(content, {
            iconUrl: pathToFileURL(icon).href,
            doneLabel: createTranslator(this.deps.settings.get().language)('notify.markDone')
          })
        })
      : new Notification({ title, body, icon })
    this.shown.add(notification)
    notification.on('click', () => {
      this.shown.delete(notification)
      // Rich toasts open their miestudio:// link instead
      if (!this.deps.richToasts) this.deps.open(target)
    })
    notification.on('close', () => this.shown.delete(notification))
    notification.show()
  }
}
