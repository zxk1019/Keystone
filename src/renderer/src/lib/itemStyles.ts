import { CalendarHeart, FileText, FolderKanban, NotebookPen, type LucideIcon } from 'lucide-react'
import type { AgendaItemType, Priority } from '@shared/types'

export const TYPE_ICONS: Record<AgendaItemType, LucideIcon> = {
  homework: NotebookPen,
  exam: FileText,
  project: FolderKanban,
  event: CalendarHeart
}

export const PRIORITY_DOTS: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-zinc-400'
}
