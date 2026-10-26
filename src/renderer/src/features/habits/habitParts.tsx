import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Flame, Trophy, X } from 'lucide-react'
import { canMark, type HabitStreak } from '@shared/habits'
import type { Habit, HabitMarkStatus } from '@shared/types'
import { formatLongDate, toDateKey } from '../../lib/dates'
import { SUBJECT_STYLES } from '../agenda/subjectStyles'
import { useWeekdaysLabel } from './useWeekdaysLabel'

/** The current streak and the record, with their icons. */
export function StreakBadges({ streak }: { streak: HabitStreak }): JSX.Element {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      <span className="flex items-center gap-1" title={t('habits.streakLabel')}>
        <Flame
          className={`size-4 ${streak.current > 0 ? 'text-orange-500' : 'text-zinc-400 dark:text-zinc-600'}`}
        />
        <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
          {t('habits.streak', { count: streak.current })}
        </span>
      </span>
      <span className="flex items-center gap-1" title={t('habits.recordLabel')}>
        <Trophy className="size-4 text-amber-500" />
        {t('habits.record', { count: streak.best })}
      </span>
    </span>
  )
}

/** Name, days and streak of a habit; clicking it opens the habit to edit it. */
export function HabitTitle({
  habit,
  streak,
  onEdit,
  className = ''
}: {
  habit: Habit
  streak: HabitStreak
  onEdit: () => void
  className?: string
}): JSX.Element {
  const weekdaysLabel = useWeekdaysLabel()
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 items-center gap-2 self-start rounded-md text-left hover:underline"
      >
        <span className={`size-3 shrink-0 rounded-full ${SUBJECT_STYLES[habit.color].solid}`} />
        <span className="truncate font-medium">{habit.name}</span>
      </button>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {weekdaysLabel(habit.weekdays)}
      </span>
      <StreakBadges streak={streak} />
    </div>
  )
}

const MARK_STYLES: Record<HabitMarkStatus, string> = {
  done: 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500',
  missed: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500'
}

/**
 * One day of a habit: a green tick, a red cross or empty. Days to come and days the habit is
 * not due cannot be clicked.
 */
export function MarkCell({
  habit,
  date,
  today,
  status,
  onClick,
  className = ''
}: {
  habit: Habit
  date: Date
  today: Date
  status: HabitMarkStatus | undefined
  onClick: () => void
  className?: string
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const markable = canMark(habit, date, today)
  const isToday = toDateKey(date) === toDateKey(today)
  const future = toDateKey(date) > toDateKey(today)
  const state = status ?? (markable ? 'none' : future ? 'future' : 'notDue')
  const label = t('habits.cell', {
    habit: habit.name,
    date: formatLongDate(date, i18n.language),
    status: t(`habits.status.${state}`)
  })
  const look = status
    ? MARK_STYLES[status]
    : markable
      ? 'border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'

  return (
    <button
      type="button"
      disabled={!markable}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-lg transition-colors disabled:cursor-default ${look} ${
        !markable && status ? 'opacity-40' : ''
      } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950' : ''} ${className}`}
    >
      {status === 'done' && <Check className="size-5" strokeWidth={3} />}
      {status === 'missed' && <X className="size-5" strokeWidth={3} />}
      {!status && !markable && state === 'notDue' && <span aria-hidden="true">–</span>}
    </button>
  )
}
