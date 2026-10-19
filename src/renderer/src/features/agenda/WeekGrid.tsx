import { useMemo, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { isSameDay } from 'date-fns'
import { Plus } from 'lucide-react'
import { timeToMinutes } from '@shared/schedule'
import type { AgendaItem, ScheduleSlot, Subject } from '@shared/types'
import { toDateKey, weekdayName } from '../../lib/dates'
import { slotTitle } from '../../lib/scheduleLayout'
import ItemChip from './ItemChip'
import { styleFor } from './subjectStyles'

/** Height of one hour in pixels */
const HOUR_HEIGHT = 56
const PX_PER_MINUTE = HOUR_HEIGHT / 60
/** Items shown per day before "+N more" */
const MAX_ITEMS_PER_DAY = 3

export interface GridColumn {
  weekday: number
  /** The real date; missing in the timetable editor, which shows a generic week */
  date?: Date
}

interface WeekGridProps {
  columns: GridColumn[]
  slots: ScheduleSlot[]
  subjects: Subject[]
  hours: { start: number; end: number }
  /** When given, a row above the hours shows each day's homework, exams, projects and events */
  items?: Map<string, AgendaItem[]>
  /** When given, today is highlighted and a line marks the current time */
  now?: Date
  onEmptyClick?: (weekday: number, hour: number) => void
  onSlotClick?: (slot: ScheduleSlot) => void
}

export default function WeekGrid({
  columns,
  slots,
  subjects,
  hours,
  items,
  now,
  onEmptyClick,
  onSlotClick
}: WeekGridProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])

  const hourList = Array.from({ length: hours.end - hours.start }, (_, i) => hours.start + i)
  const bodyHeight = hourList.length * HOUR_HEIGHT
  // The header and the body use the same columns; the stable gutter keeps them aligned
  // even though only the body has a scrollbar
  const gridStyle = { gridTemplateColumns: `3rem repeat(${columns.length}, minmax(0, 1fr))` }
  const isToday = (column: GridColumn): boolean =>
    Boolean(now && column.date && isSameDay(column.date, now))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="grid overflow-y-hidden border-b border-zinc-200 [scrollbar-gutter:stable] dark:border-zinc-800"
        style={gridStyle}
      >
        <div />
        {columns.map((column) => (
          <div
            key={column.weekday}
            className="flex flex-col items-center gap-0.5 border-l border-zinc-200 py-2 dark:border-zinc-800"
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {weekdayName(column.weekday, i18n.language, column.date ? 'short' : 'long')}
            </span>
            {column.date && (
              <span
                className={`flex size-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday(column) ? 'bg-indigo-600 text-white' : ''
                }`}
              >
                {column.date.getDate()}
              </span>
            )}
          </div>
        ))}

        {items && <div className="border-t border-zinc-200 dark:border-zinc-800" />}
        {items &&
          columns.map((column) => {
            const dayItems = column.date ? (items.get(toDateKey(column.date)) ?? []) : []
            return (
              <div
                key={column.weekday}
                className="flex min-h-9 flex-col gap-1 border-t border-l border-zinc-200 p-1 dark:border-zinc-800"
              >
                {dayItems.slice(0, MAX_ITEMS_PER_DAY).map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    subject={item.subjectId ? subjectById.get(item.subjectId) : undefined}
                  />
                ))}
                {dayItems.length > MAX_ITEMS_PER_DAY && (
                  <span className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {t('agenda.moreItems', { count: dayItems.length - MAX_ITEMS_PER_DAY })}
                  </span>
                )}
              </div>
            )
          })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-2 [scrollbar-gutter:stable]">
        <div className="grid" style={gridStyle}>
          <div className="relative" style={{ height: bodyHeight }}>
            {hourList.map((hour, index) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-xs text-zinc-500 tabular-nums dark:text-zinc-400"
                style={{ top: index * HOUR_HEIGHT }}
              >
                {hour}:00
              </span>
            ))}
          </div>

          {columns.map((column) => (
            <div
              key={column.weekday}
              className={`relative border-l border-zinc-200 dark:border-zinc-800 ${
                isToday(column) ? 'bg-indigo-50/60 dark:bg-indigo-500/5' : ''
              }`}
              style={{ height: bodyHeight }}
            >
              {hourList.map((hour, index) =>
                onEmptyClick ? (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onEmptyClick(column.weekday, hour)}
                    aria-label={`${t('agenda.addClass')}: ${weekdayName(column.weekday, i18n.language, 'long')} ${hour}:00`}
                    className="group absolute inset-x-0 flex items-center justify-center border-t border-zinc-100 hover:bg-indigo-50 dark:border-zinc-800/70 dark:hover:bg-indigo-500/10"
                    style={{ top: index * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    <Plus className="size-4 text-indigo-500 opacity-0 group-hover:opacity-70" />
                  </button>
                ) : (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-zinc-100 dark:border-zinc-800/70"
                    style={{ top: index * HOUR_HEIGHT }}
                  />
                )
              )}

              {slots
                .filter((slot) => slot.weekday === column.weekday)
                .map((slot) => (
                  <SlotBlock
                    key={slot.id}
                    slot={slot}
                    title={slotTitle(slot, subjectById)}
                    subject={slot.subjectId ? subjectById.get(slot.subjectId) : undefined}
                    firstHour={hours.start}
                    onClick={onSlotClick}
                  />
                ))}

              {now && isToday(column) && <NowLine now={now} hours={hours} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SlotBlock({
  slot,
  title,
  subject,
  firstHour,
  onClick
}: {
  slot: ScheduleSlot
  title: string
  subject?: Subject
  firstHour: number
  onClick?: (slot: ScheduleSlot) => void
}): JSX.Element {
  const start = timeToMinutes(slot.start)
  const height = (timeToMinutes(slot.end) - start) * PX_PER_MINUTE
  // 1px of margin above and below so back-to-back classes do not touch
  const style = { top: (start - firstHour * 60) * PX_PER_MINUTE + 1, height: height - 2 }
  // Short slots (like a 30-minute recess) only have room for the name; the rest is in the tooltip
  const compact = height < 40
  const tooltip = [title, `${slot.start}–${slot.end}`, slot.room].filter(Boolean).join(' · ')

  const className = `absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-1.5 text-left text-xs leading-tight ${
    styleFor(subject).block
  } ${compact ? 'flex items-center' : 'py-1'}`

  // Long names wrap to a second line, so subjects that start the same way
  // ("Desenvolupament web servidor" / "... client") can still be told apart
  const content = compact ? (
    <span className="block truncate font-semibold">{title}</span>
  ) : (
    <>
      <span className="line-clamp-2 font-semibold break-words">{title}</span>
      <span className="block truncate tabular-nums opacity-75">
        {slot.start}–{slot.end}
        {slot.room && ` · ${slot.room}`}
      </span>
    </>
  )

  return onClick ? (
    <button
      type="button"
      onClick={() => onClick(slot)}
      title={tooltip}
      className={`${className} z-10 hover:brightness-95 dark:hover:brightness-125`}
      style={style}
    >
      {content}
    </button>
  ) : (
    <div className={className} style={style} title={tooltip}>
      {content}
    </div>
  )
}

function NowLine({
  now,
  hours
}: {
  now: Date
  hours: { start: number; end: number }
}): JSX.Element | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < hours.start * 60 || minutes > hours.end * 60) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex -translate-y-1/2 items-center"
      style={{ top: (minutes - hours.start * 60) * PX_PER_MINUTE }}
    >
      <span className="-ml-1 size-2 rounded-full bg-red-500" />
      <span className="h-0.5 flex-1 bg-red-500" />
    </div>
  )
}
