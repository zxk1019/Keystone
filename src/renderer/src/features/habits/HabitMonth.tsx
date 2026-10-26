import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { isSameMonth } from 'date-fns'
import type { HabitStreak } from '@shared/habits'
import type { Habit, HabitMarkStatus } from '@shared/types'
import { monthGrid, toDateKey, weekdayName } from '../../lib/dates'
import { MarkCell, StreakBadges } from './habitParts'

interface HabitMonthProps {
  habit: Habit
  marks: Map<string, HabitMarkStatus>
  streak: HabitStreak
  month: Date
  today: Date
  onMark: (habit: Habit, date: Date) => void
}

/** The whole month of one habit, with a tick or a cross on each day. */
export default function HabitMonth({
  habit,
  marks,
  streak,
  month,
  today,
  onMark
}: HabitMonthProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const weeks = monthGrid(month)
  const monthKey = toDateKey(month).slice(0, 7)
  const ofMonth = [...marks].filter(([date]) => date.startsWith(monthKey))
  const done = ofMonth.filter(([, status]) => status === 'done').length
  const missed = ofMonth.length - done

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StreakBadges streak={streak} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('habits.monthSummary', { done, missed })}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
            <div
              key={weekday}
              className="py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              {weekdayName(weekday, i18n.language, 'short')}
            </div>
          ))}
        </div>
        <div className="-mb-px grid grid-cols-7">
          {weeks.flat().map((date) => (
            <div
              key={date.toISOString()}
              className={`flex flex-col items-center gap-1 border-b border-l border-zinc-200 p-1.5 sm:p-2 [&:nth-child(7n+1)]:border-l-0 dark:border-zinc-800 ${
                isSameMonth(date, month) ? '' : 'opacity-40'
              }`}
            >
              <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {date.getDate()}
              </span>
              <MarkCell
                habit={habit}
                date={date}
                today={today}
                status={marks.get(toDateKey(date))}
                onClick={() => onMark(habit, date)}
                className="size-9 sm:size-11"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
