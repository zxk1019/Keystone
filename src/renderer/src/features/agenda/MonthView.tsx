import { useMemo, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { isSameDay, isSameMonth } from 'date-fns'
import type { AgendaItem, Subject } from '@shared/types'
import { monthGrid, toDateKey, weekdayName } from '../../lib/dates'
import { styleFor } from './subjectStyles'

/** Dots shown per day before "+N" */
const MAX_DOTS = 4

interface MonthViewProps {
  month: Date
  items: Map<string, AgendaItem[]>
  subjects: Subject[]
  today: Date
  onPickDay: (date: Date) => void
}

export default function MonthView({
  month,
  items,
  subjects,
  today,
  onPickDay
}: MonthViewProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const weeks = monthGrid(month)
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: 'full' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <div
            key={weekday}
            className="py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            {weekdayName(weekday, language, 'short')}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(5rem, 1fr))` }}
      >
        {weeks.flat().map((date) => {
          // Only exams and deadlines get a dot; personal events stay out of the month view
          const deadlines = (items.get(toDateKey(date)) ?? []).filter(
            (item) => item.type !== 'event'
          )
          const isToday = isSameDay(date, today)
          const description = deadlines
            .map((item) => `${t(`agenda.itemType.${item.type}`)}: ${item.title}`)
            .join('\n')

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onPickDay(date)}
              title={description || undefined}
              aria-label={[fullDate.format(date), description].filter(Boolean).join('. ')}
              className="flex flex-col items-start gap-1.5 border-b border-l border-zinc-200 p-2 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full text-sm tabular-nums ${
                  isToday
                    ? 'bg-indigo-600 font-semibold text-white'
                    : isSameMonth(date, month)
                      ? ''
                      : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {date.getDate()}
              </span>
              {deadlines.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5 px-1">
                  {deadlines.slice(0, MAX_DOTS).map((item) => {
                    const color = styleFor(
                      item.subjectId ? subjectById.get(item.subjectId) : undefined
                    ).solid
                    // Exams are diamonds so they stand out from homework and projects
                    const shape =
                      item.type === 'exam'
                        ? 'size-2.5 rotate-45 rounded-[2px]'
                        : 'size-2 rounded-full'
                    return (
                      <span
                        key={item.id}
                        className={`${shape} ${color} ${item.done ? 'opacity-40' : ''}`}
                      />
                    )
                  })}
                  {deadlines.length > MAX_DOTS && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      +{deadlines.length - MAX_DOTS}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
