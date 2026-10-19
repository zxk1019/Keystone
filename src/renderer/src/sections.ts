import { BookOpen, CalendarDays, House, ListChecks, Settings, type LucideIcon } from 'lucide-react'

export type SectionId = 'today' | 'agenda' | 'tasks' | 'study' | 'settings'

/** Sections in the upper part of the sidebar; Settings sits apart at the bottom. */
export const MAIN_SECTIONS: SectionId[] = ['today', 'agenda', 'tasks', 'study']

export const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  today: House,
  agenda: CalendarDays,
  tasks: ListChecks,
  study: BookOpen,
  settings: Settings
}
