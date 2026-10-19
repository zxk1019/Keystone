import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { isOverdue } from '@shared/items'
import type { AgendaItem, Subject } from '@shared/types'
import { formatDueDate } from '../../lib/dates'
import { PRIORITY_DOTS, TYPE_ICONS } from '../../lib/itemStyles'
import { useAgendaStore } from '../../store/agendaStore'
import { useItemDialogStore } from '../../store/itemDialogStore'
import { SUBJECT_STYLES } from '../agenda/subjectStyles'

interface TaskRowProps {
  item: AgendaItem
  subject?: Subject
  today: Date
  /** Hide the date when the heading above already says it ("Today", "Tomorrow") */
  showDate?: boolean
}

/** One homework, exam, project or event: a checkbox to mark it done, the rest opens it. */
export default function TaskRow({
  item,
  subject,
  today,
  showDate = true
}: TaskRowProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const setItemDone = useAgendaStore((state) => state.setItemDone)
  const openEdit = useItemDialogStore((state) => state.openEdit)
  const Icon = TYPE_ICONS[item.type]
  const late = isOverdue(item, today)

  return (
    <div className="flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={t(item.done ? 'tasks.markPending' : 'tasks.markDone')}
        onClick={() => setItemDone(item.id, !item.done)}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          item.done
            ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
            : 'border-zinc-300 hover:border-indigo-500 dark:border-zinc-600'
        }`}
      >
        {item.done && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      <button
        type="button"
        onClick={() => openEdit(item)}
        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
      >
        <span className="flex items-center gap-2">
          <Icon
            className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400"
            aria-label={t(`agenda.itemType.${item.type}`)}
          />
          <span
            className={`truncate text-sm font-medium ${item.done ? 'text-zinc-400 line-through dark:text-zinc-500' : ''}`}
          >
            {item.title}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-xs text-zinc-500 dark:text-zinc-400">
          {subject && (
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${SUBJECT_STYLES[subject.color].solid}`} />
              {subject.name}
            </span>
          )}
          {(showDate || item.time) && (
            <span
              className={`tabular-nums ${late ? 'font-medium text-red-600 dark:text-red-400' : ''}`}
            >
              {[showDate && formatDueDate(item.date, today, i18n.language), item.time]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {item.type !== 'event' && (
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${PRIORITY_DOTS[item.priority]}`} />
              {t(`priority.${item.priority}`)}
            </span>
          )}
          {item.topics && <span className="truncate">{item.topics}</span>}
        </span>
      </button>
    </div>
  )
}
