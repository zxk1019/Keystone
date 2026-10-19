import { remainingMs, type PhaseEvent, type TimerState } from '@shared/studyTimer'
import type { Translate } from './i18n'
import type { NotificationContent } from './notificationText'

/** Tray tooltip while the timer is in use; null when it is not. */
export function trayStatus(state: TimerState, now: number, t: Translate): string | null {
  if (state.status === 'idle') return null
  if (state.status === 'paused') return t('tray.paused')
  const minutes = String(Math.ceil(remainingMs(state, now) / 60_000))
  return t(state.phase === 'focus' ? 'tray.studying' : 'tray.onBreak', { minutes })
}

/** The notification shown when a break starts or ends and the app is not in front. */
export function phaseNotification(
  event: PhaseEvent,
  state: TimerState,
  t: Translate
): NotificationContent {
  return event === 'breakStarted'
    ? {
        title: t('notify.breakStartTitle'),
        body: t('notify.breakStartBody', { count: String(Math.round(state.durationMs / 60_000)) }),
        target: { section: 'study' }
      }
    : {
        title: t('notify.breakEndTitle'),
        body: t('notify.breakEndBody', { count: String(state.block) }),
        target: { section: 'study' }
      }
}
