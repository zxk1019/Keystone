import { parseISO } from 'date-fns'
import type { NavigationTarget } from '@shared/api'
import type { PlannedNotification } from '@shared/notifications'
import type { AgendaItem, Language, Subject } from '@shared/types'
import type { Translate } from './i18n'

/** Item titles listed in one notification before "and N more" */
const MAX_LISTED = 3

export interface NotificationContent {
  title: string
  body: string
  /** What to open when the notification is clicked */
  target: NavigationTarget
}

function bulletList(items: AgendaItem[], t: Translate): string[] {
  const lines = items.slice(0, MAX_LISTED).map((item) => `• ${item.title}`)
  if (items.length > MAX_LISTED) {
    lines.push(t('notify.more', { count: String(items.length - MAX_LISTED) }))
  }
  return lines
}

/** Turns a planned reminder into the text Windows shows. Null when there is nothing to say. */
export function describeNotification(
  planned: PlannedNotification,
  t: Translate,
  language: Language,
  subjects: Map<string, Subject>
): NotificationContent | null {
  const subjectName = (item: AgendaItem): string | undefined =>
    item.subjectId ? subjects.get(item.subjectId)?.name : undefined

  switch (planned.kind) {
    case 'summary': {
      const { overdue, today, tomorrow } = planned
      if (overdue.length + today.length + tomorrow.length === 0) return null
      const counts = [
        overdue.length > 0 && t('notify.countOverdue', { count: String(overdue.length) }),
        today.length > 0 && t('notify.countToday', { count: String(today.length) }),
        tomorrow.length > 0 && t('notify.countTomorrow', { count: String(tomorrow.length) })
      ].filter(Boolean)
      return {
        title: t('notify.summaryTitle'),
        body: [counts.join(' · '), ...bulletList([...overdue, ...today, ...tomorrow], t)].join(
          '\n'
        ),
        target: { section: 'today' }
      }
    }

    case 'overdue': {
      const { items } = planned
      if (items.length === 1) {
        const [item] = items
        const date = new Intl.DateTimeFormat(language, {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }).format(parseISO(item.date))
        return {
          title: t('notify.overdueOne', { title: item.title }),
          body: [subjectName(item), t('notify.wasDue', { date })].filter(Boolean).join(' · '),
          target: { section: 'tasks', itemId: item.id }
        }
      }
      return {
        title: t('notify.overdueMany', { count: String(items.length) }),
        body: bulletList(items, t).join('\n'),
        target: { section: 'tasks', tasksStatus: 'overdue' }
      }
    }

    case 'exam': {
      const { exam, daysLeft } = planned
      return {
        title:
          daysLeft === 1
            ? t('notify.examTomorrow', { title: exam.title })
            : t('notify.examIn', { title: exam.title, count: String(daysLeft) }),
        body: [subjectName(exam), exam.topics].filter(Boolean).join(' · '),
        target: { section: 'today', itemId: exam.id }
      }
    }
  }
}
