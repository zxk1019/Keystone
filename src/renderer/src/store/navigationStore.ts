import { create } from 'zustand'
import type { StatusFilter } from '../lib/taskSections'
import type { SectionId } from '../sections'

interface NavigationState {
  section: SectionId
  /** The Agenda shows the timetable editor instead of the calendar */
  editingSchedule: boolean
  /** Filter of the Tasks screen; here so a notification can open Tasks on "Overdue" */
  tasksStatus: StatusFilter
  goTo: (section: SectionId) => void
  openScheduleEditor: () => void
  closeScheduleEditor: () => void
  setTasksStatus: (status: StatusFilter) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  section: 'today',
  editingSchedule: false,
  tasksStatus: 'pending',
  goTo: (section) => set({ section, editingSchedule: false }),
  openScheduleEditor: () => set({ section: 'agenda', editingSchedule: true }),
  closeScheduleEditor: () => set({ editingSchedule: false }),
  setTasksStatus: (tasksStatus) => set({ tasksStatus })
}))
