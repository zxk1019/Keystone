import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { isSameDay } from 'date-fns'
import type { HabitStreak } from '@shared/habits'
import type { Habit, HabitMarkStatus } from '@shared/types'
import { isoWeekday, toDateKey, weekdayName } from '../../lib/dates'
import { HabitTitle, MarkCell } from './habitParts'

interface HabitWeekProps {
  habits: Habit[]
  marks: Map<string, Map<string, HabitMarkStatus>>
  streaks: Map<string, HabitStreak>
  /** Monday to Sunday */
  dates: Date[]
  today: Date
  onMark: (habit: Habit, date: Date) => void
  onEdit: (habit: Habit) => void
}

// The day names sit above the cells: same padding and border as the rows below
const ROW = 'flex flex-col gap-3 border px-3 md:flex-row md:items-center md:gap-4'
const TITLE_WIDTH = 'md:w-56 md:shrink-0'

/** One row per habit and one column per day, as in the Agenda's week. */
export default function HabitWeek({
  habits,
  marks,
  streaks,
  dates,
  today,
  onMark,
  onEdit
}: HabitWeekProps): JSX.Element {
  const { i18n } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      <div className={`${ROW} border-transparent`} aria-hidden="true">
        <div className={`hidden ${TITLE_WIDTH} md:block`} />
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {dates.map((date) => (
            <div
              key={date.toISOString()}
              className="flex flex-col items-center text-xs text-zinc-500 dark:text-zinc-400"
            >
              <span>{weekdayName(isoWeekday(date), i18n.language, 'short')}</span>
              <span
                className={`flex size-6 items-center justify-center rounded-full tabular-nums ${
                  isSameDay(date, today) ? 'bg-indigo-600 font-semibold text-white' : ''
                }`}
              >
                {date.getDate()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {habits.map((habit) => (
        <div
          key={habit.id}
          className={`${ROW} rounded-xl border-zinc-200 py-3 dark:border-zinc-800`}
        >
          <HabitTitle
            habit={habit}
            streak={streaks.get(habit.id) ?? { current: 0, best: 0 }}
            onEdit={() => onEdit(habit)}
            className={TITLE_WIDTH}
          />
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {dates.map((date) => (
              <MarkCell
                key={date.toISOString()}
                habit={habit}
                date={date}
                today={today}
                status={marks.get(habit.id)?.get(toDateKey(date))}
                onClick={() => onMark(habit, date)}
                className="h-10 w-full"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
