import { useMemo, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { addDays, addMonths, addWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
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
import { WEEKEND, itemsByDate, visibleHours, visibleWeekdays } from '../../lib/scheduleLayout'
import { useAgendaStore } from '../../store/agendaStore'
import { useNavigationStore } from '../../store/navigationStore'
import MonthView from './MonthView'
import ScheduleEditor from './ScheduleEditor'
import WeekGrid from './WeekGrid'

type View = 'week' | 'month'

export default function AgendaPage(): JSX.Element | null {
  const { t, i18n } = useTranslation()
  const agenda = useAgendaStore((state) => state.agenda)
  const editing = useNavigationStore((state) => state.editingSchedule)
  const openEditor = useNavigationStore((state) => state.openScheduleEditor)
  const [view, setView] = useState<View>('week')
  // Any date inside the week or month being shown
  const [anchor, setAnchor] = useState(() => new Date())
  const now = useNow()
  const items = useMemo(() => itemsByDate(agenda?.items ?? []), [agenda])

  if (!agenda) return null
  if (editing) return <ScheduleEditor />

  const language = i18n.language
  const weekStart = startOfSchoolWeek(anchor)
  const weekendItems = WEEKEND.flatMap(
    (weekday) => items.get(toDateKey(addDays(weekStart, weekday - 1))) ?? []
  )
  const weekdays = visibleWeekdays(agenda.schedule, weekendItems)
  const dates = datesOfWeek(weekStart, weekdays)

  const title =
    view === 'week'
      ? formatDateRange(dates[0], dates[dates.length - 1], language)
      : formatMonth(anchor, language)

  const move = (direction: 1 | -1): void =>
    setAnchor((current) =>
      view === 'week' ? addWeeks(current, direction) : addMonths(current, direction)
    )

  return (
    <div className="flex h-full flex-col gap-4 px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t('nav.agenda')} />
        <div className="flex items-center gap-2">
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
          <Button icon={Pencil} onClick={openEditor}>
            {t('agenda.editSchedule')}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
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

      {view === 'week' && agenda.schedule.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-500/40 dark:bg-indigo-500/10">
          <span>{t('agenda.emptySchedule')}</span>
          <Button variant="primary" icon={Pencil} onClick={openEditor}>
            {t('agenda.editSchedule')}
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        {view === 'week' ? (
          <WeekGrid
            columns={weekdays.map((weekday, index) => ({ weekday, date: dates[index] }))}
            slots={agenda.schedule}
            subjects={agenda.subjects}
            hours={visibleHours(agenda.schedule, false)}
            items={items}
            now={now}
          />
        ) : (
          <MonthView
            month={anchor}
            items={items}
            subjects={agenda.subjects}
            today={now}
            onPickDay={(date) => {
              setAnchor(date)
              setView('week')
            }}
          />
        )}
      </div>
    </div>
  )
}
