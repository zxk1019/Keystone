import { useMemo, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { addMonths, addWeeks, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, Plus } from 'lucide-react'
import { habitStreak, marksByHabit, nextMarkStatus, type HabitStreak } from '@shared/habits'
import type { Habit } from '@shared/types'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import { segmentClass, segmentedClass } from '../../components/styles'
import { useNow } from '../../hooks/useNow'
import {
  datesOfWeek,
  formatDateRange,
  formatMonth,
  startOfSchoolWeek,
  toDateKey
} from '../../lib/dates'
import { useHabitsStore } from '../../store/habitsStore'
import { SUBJECT_STYLES } from '../agenda/subjectStyles'
import HabitDialog from './HabitDialog'
import HabitMonth from './HabitMonth'
import HabitWeek from './HabitWeek'

type View = 'week' | 'month'

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

export default function HabitsPage(): JSX.Element | null {
  const { t, i18n } = useTranslation()
  const data = useHabitsStore((state) => state.data)
  const setMark = useHabitsStore((state) => state.setMark)
  const [view, setView] = useState<View>('week')
  // Any date inside the week or month being shown
  const [anchor, setAnchor] = useState(() => new Date())
  // The habit shown in the month view
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // A new key on each opening, so the dialog always starts from scratch
  const [dialog, setDialog] = useState<{ key: number; habit?: Habit } | null>(null)
  const now = useNow()
  const todayKey = toDateKey(now)

  const marks = useMemo(() => marksByHabit(data?.marks ?? []), [data])
  const streaks = useMemo(() => {
    const result = new Map<string, HabitStreak>()
    // Worked out again only when the day changes, not every minute
    const today = parseISO(todayKey)
    for (const habit of data?.habits ?? []) {
      result.set(habit.id, habitStreak(habit, marks.get(habit.id) ?? new Map(), today))
    }
    return result
  }, [data, marks, todayKey])

  if (!data) return null

  const { habits } = data
  const language = i18n.language
  const weekDates = datesOfWeek(startOfSchoolWeek(anchor), ALL_WEEKDAYS)
  const selected = habits.find((habit) => habit.id === selectedId) ?? habits[0]

  const title =
    view === 'week'
      ? formatDateRange(weekDates[0], weekDates[6], language)
      : formatMonth(anchor, language)

  const move = (direction: 1 | -1): void =>
    setAnchor((current) =>
      view === 'week' ? addWeeks(current, direction) : addMonths(current, direction)
    )

  const mark = (habit: Habit, date: Date): void => {
    const day = toDateKey(date)
    void setMark(habit.id, day, nextMarkStatus(marks.get(habit.id)?.get(day)))
  }

  const openNew = (): void => setDialog({ key: Date.now() })
  const openEdit = (habit: Habit): void => setDialog({ key: Date.now(), habit })

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t('nav.habits')} />
        <div className="flex items-center gap-2">
          {habits.length > 0 && (
            <div role="radiogroup" aria-label={t('agenda.view')} className={segmentedClass}>
              {(['week', 'month'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={view === option}
                  onClick={() => setView(option)}
                  className={segmentClass(view === option)}
                >
                  {t(`agenda.${option}`)}
                </button>
              ))}
            </div>
          )}
          {habits.length > 0 && (
            <Button variant="primary" icon={Plus} onClick={openNew}>
              {t('habits.new')}
            </Button>
          )}
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <Flame className="size-8 text-orange-500" />
          <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{t('habits.empty')}</p>
          <Button variant="primary" icon={Plus} onClick={openNew}>
            {t('habits.new')}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              icon={ChevronLeft}
              aria-label={t('agenda.previous')}
              onClick={() => move(-1)}
            />
            <Button
              variant="ghost"
              icon={ChevronRight}
              aria-label={t('agenda.next')}
              onClick={() => move(1)}
            />
            <Button onClick={() => setAnchor(new Date())}>{t('agenda.today')}</Button>
            <h2 className="ml-2 text-lg font-medium">{title}</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('habits.markHint')}</p>

          {view === 'week' ? (
            <HabitWeek
              habits={habits}
              marks={marks}
              streaks={streaks}
              dates={weekDates}
              today={now}
              onMark={mark}
              onEdit={openEdit}
            />
          ) : (
            <>
              <div
                role="radiogroup"
                aria-label={t('habits.pick')}
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
              >
                {habits.map((habit) => (
                  <button
                    key={habit.id}
                    type="button"
                    role="radio"
                    aria-checked={habit.id === selected.id}
                    onClick={() => setSelectedId(habit.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                      habit.id === selected.id
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`size-2.5 rounded-full ${SUBJECT_STYLES[habit.color].solid}`}
                    />
                    {habit.name}
                  </button>
                ))}
              </div>
              <HabitMonth
                habit={selected}
                marks={marks.get(selected.id) ?? new Map()}
                streak={streaks.get(selected.id) ?? { current: 0, best: 0 }}
                month={anchor}
                today={now}
                onMark={mark}
              />
              <Button variant="ghost" onClick={() => openEdit(selected)} className="self-start">
                {t('habits.edit')}
              </Button>
            </>
          )}
        </>
      )}

      {dialog && (
        <HabitDialog
          key={dialog.key}
          habit={dialog.habit}
          habits={habits}
          markCount={dialog.habit ? (marks.get(dialog.habit.id)?.size ?? 0) : 0}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
