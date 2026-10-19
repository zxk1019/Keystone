import { useMemo, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, FileText, ListChecks, Pencil, Plus } from 'lucide-react'
import { daysUntil } from '@shared/dates'
import { dueGroup, upcomingExams, urgentItems } from '@shared/items'
import { currentAndNextSlot, timeToMinutes } from '@shared/schedule'
import type { AgendaItem, ScheduleSlot, Subject } from '@shared/types'
import Button from '../../components/Button'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import { useNow } from '../../hooks/useNow'
import { formatCountdown, formatLongDate, isoWeekday } from '../../lib/dates'
import { slotTitle } from '../../lib/scheduleLayout'
import { useAgendaStore } from '../../store/agendaStore'
import { useItemDialogStore } from '../../store/itemDialogStore'
import { useNavigationStore } from '../../store/navigationStore'
import { SUBJECT_STYLES, styleFor } from '../agenda/subjectStyles'
import TaskRow from '../tasks/TaskRow'

export default function TodayPage(): JSX.Element | null {
  const { t, i18n } = useTranslation()
  const agenda = useAgendaStore((state) => state.agenda)
  const openNew = useItemDialogStore((state) => state.openNew)
  const now = useNow()
  const subjectById = useMemo(
    () => new Map((agenda?.subjects ?? []).map((s) => [s.id, s])),
    [agenda]
  )

  if (!agenda) return null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeader title={t('nav.today')} />
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {formatLongDate(now, i18n.language)}
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => openNew()}>
          {t('tasks.new')}
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ClassesCard schedule={agenda.schedule} subjects={subjectById} now={now} />
          <ExamsCard items={agenda.items} subjects={subjectById} now={now} />
        </div>
        <PendingCard items={agenda.items} subjects={subjectById} now={now} />
      </div>
    </div>
  )
}

interface CardProps {
  subjects: Map<string, Subject>
  now: Date
}

function ClassesCard({
  schedule,
  subjects,
  now
}: CardProps & { schedule: ScheduleSlot[] }): JSX.Element {
  const { t } = useTranslation()
  const openScheduleEditor = useNavigationStore((state) => state.openScheduleEditor)
  const weekday = isoWeekday(now)
  const minutes = now.getHours() * 60 + now.getMinutes()
  const todaySlots = schedule.filter((slot) => slot.weekday === weekday)
  const { current, next } = currentAndNextSlot(todaySlots, minutes)

  let empty: JSX.Element | null = null
  if (schedule.length === 0) {
    empty = (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        {t('today.noSchedule')}
        <Button icon={Pencil} onClick={openScheduleEditor}>
          {t('agenda.editSchedule')}
        </Button>
      </div>
    )
  } else if (todaySlots.length === 0) {
    empty = (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t(weekday >= 6 ? 'today.weekend' : 'today.noClasses')}
      </p>
    )
  }

  return (
    <Card title={t('today.classes')} icon={CalendarClock}>
      {empty ?? (
        <ul className="flex flex-col gap-1">
          {todaySlots.map((slot) => {
            const subject = slot.subjectId ? subjects.get(slot.subjectId) : undefined
            const isCurrent = slot.id === current?.id
            const isNext = slot.id === next?.id
            const isOver = timeToMinutes(slot.end) <= minutes
            return (
              <li
                key={slot.id}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                  isCurrent ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
                } ${isOver ? 'opacity-50' : ''}`}
              >
                <span className="w-24 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {slot.start}–{slot.end}
                </span>
                <span className={`h-8 w-1 shrink-0 rounded-full ${styleFor(subject).solid}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {slotTitle(slot, subjects)}
                  </span>
                  {slot.room && (
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {slot.room}
                    </span>
                  )}
                </span>
                {isCurrent && (
                  <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                    {t('today.now')}
                  </span>
                )}
                {isNext && (
                  <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                    {t('today.next')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** Red when it is very close, amber within a week, neutral otherwise */
function countdownStyle(days: number): string {
  if (days <= 2) return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
  if (days <= 7) return 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
  return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
}

function ExamsCard({ items, subjects, now }: CardProps & { items: AgendaItem[] }): JSX.Element {
  const { t, i18n } = useTranslation()
  const openEdit = useItemDialogStore((state) => state.openEdit)
  const exams = upcomingExams(items, now)

  return (
    <Card title={t('today.exams')} icon={FileText}>
      {exams.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('today.noExams')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {exams.map((exam) => {
            const subject = exam.subjectId ? subjects.get(exam.subjectId) : undefined
            return (
              <li key={exam.id}>
                <button
                  type="button"
                  onClick={() => openEdit(exam)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{exam.title}</span>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {subject && (
                        <>
                          <span
                            className={`size-2 shrink-0 rounded-full ${SUBJECT_STYLES[subject.color].solid}`}
                          />
                          <span className="truncate">{subject.name}</span>
                        </>
                      )}
                      {exam.topics && <span className="truncate">· {exam.topics}</span>}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${countdownStyle(daysUntil(exam.date, now))}`}
                  >
                    {formatCountdown(exam.date, now, i18n.language)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function PendingCard({ items, subjects, now }: CardProps & { items: AgendaItem[] }): JSX.Element {
  const { t } = useTranslation()
  const urgent = urgentItems(items, now)
  const groups = (['overdue', 'today', 'tomorrow'] as const)
    .map((key) => ({ key, items: urgent.filter((item) => dueGroup(item, now) === key) }))
    .filter((group) => group.items.length > 0)

  return (
    <Card title={t('today.pending')} icon={ListChecks}>
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('today.nothingPending')}</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-0.5">
            <h3
              className={`px-2 text-xs font-semibold tracking-wide uppercase ${
                group.key === 'overdue'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {t(`tasks.group.${group.key}`)}
            </h3>
            {group.items.map((item) => (
              <TaskRow
                key={item.id}
                item={item}
                subject={item.subjectId ? subjects.get(item.subjectId) : undefined}
                today={now}
                showDate={group.key === 'overdue'}
              />
            ))}
          </div>
        ))
      )}
    </Card>
  )
}
