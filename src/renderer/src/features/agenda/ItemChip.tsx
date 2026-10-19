import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarHeart, FileText, FolderKanban, NotebookPen, type LucideIcon } from 'lucide-react'
import type { AgendaItem, AgendaItemType, Subject } from '@shared/types'
import { styleFor } from './subjectStyles'

const TYPE_ICONS: Record<AgendaItemType, LucideIcon> = {
  homework: NotebookPen,
  exam: FileText,
  project: FolderKanban,
  event: CalendarHeart
}

/** A small label for a homework, exam, project or event, in the color of its subject. */
export default function ItemChip({
  item,
  subject
}: {
  item: AgendaItem
  subject?: Subject
}): JSX.Element {
  const { t } = useTranslation()
  const Icon = TYPE_ICONS[item.type]
  const typeName = t(`agenda.itemType.${item.type}`)

  return (
    <div
      title={`${typeName}: ${item.title}`}
      className={`flex items-center gap-1 rounded border-l-2 px-1.5 py-0.5 text-xs ${styleFor(subject).block} ${
        item.done ? 'line-through opacity-50' : ''
      }`}
    >
      <Icon className="size-3 shrink-0" aria-label={typeName} />
      <span className="truncate">{item.title}</span>
    </div>
  )
}
