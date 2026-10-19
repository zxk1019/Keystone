import { create } from 'zustand'
import type { SectionId } from '../sections'

interface NavigationState {
  section: SectionId
  /** The Agenda shows the timetable editor instead of the calendar */
  editingSchedule: boolean
  goTo: (section: SectionId) => void
  openScheduleEditor: () => void
  closeScheduleEditor: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  section: 'today',
  editingSchedule: false,
  goTo: (section) => set({ section, editingSchedule: false }),
  openScheduleEditor: () => set({ section: 'agenda', editingSchedule: true }),
  closeScheduleEditor: () => set({ editingSchedule: false })
}))
