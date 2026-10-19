import type { AgendaData, AgendaItem, Draft, ScheduleSlot, Settings, Subject } from './types'

/** IPC channel names used between the preload script and the main process. */
export const IPC = {
  getSettings: 'settings:get',
  updateSettings: 'settings:update',
  settingsChanged: 'settings:changed',
  exportData: 'data:export',
  importData: 'data:import',
  dataChanged: 'data:changed',
  getAgenda: 'agenda:get',
  saveSubject: 'subjects:save',
  deleteSubject: 'subjects:delete',
  saveScheduleSlot: 'schedule:save',
  deleteScheduleSlot: 'schedule:delete',
  saveItem: 'items:save',
  setItemDone: 'items:set-done',
  deleteItem: 'items:delete',
  getAppInfo: 'app:info',
  sendTestNotification: 'notifications:test',
  navigate: 'app:navigate',
  takeNavigation: 'app:take-navigation'
} as const

export type ExportResult = { status: 'saved'; path: string } | { status: 'canceled' }

export type ImportResult = { status: 'imported' } | { status: 'canceled' } | { status: 'invalid' }

/** Where to take the user, e.g. after clicking a notification */
export interface NavigationTarget {
  section: 'today' | 'tasks' | 'agenda'
  /** Open this item's dialog */
  itemId?: string
  /** Show this filter on the Tasks screen */
  tasksStatus?: 'overdue'
}

export interface AppInfo {
  /** False when running with `npm run dev` */
  packaged: boolean
}

export type SaveSlotResult =
  { status: 'saved'; agenda: AgendaData } | { status: 'overlap'; conflict: ScheduleSlot }

/** What the preload script exposes to the renderer as `window.api`. */
export interface DesktopApi {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  /** Returns a function that stops listening. */
  onSettingsChanged(callback: (settings: Settings) => void): () => void
  exportData(): Promise<ExportResult>
  importData(): Promise<ImportResult>
  /** Fires when the whole data set is replaced, e.g. after importing a backup. */
  onDataChanged(callback: () => void): () => void

  getAgenda(): Promise<AgendaData>
  saveSubject(subject: Draft<Subject>): Promise<AgendaData>
  /** Also deletes the classes of that subject. */
  deleteSubject(id: string): Promise<AgendaData>
  saveScheduleSlot(slot: Draft<ScheduleSlot>): Promise<SaveSlotResult>
  deleteScheduleSlot(id: string): Promise<AgendaData>
  saveItem(item: Draft<AgendaItem>): Promise<AgendaData>
  setItemDone(id: string, done: boolean): Promise<AgendaData>
  deleteItem(id: string): Promise<AgendaData>

  getAppInfo(): Promise<AppInfo>
  sendTestNotification(): Promise<void>
  /** Fires when the main process wants to show something (a notification was clicked). */
  onNavigate(callback: () => void): () => void
  /** Returns the pending place to go, if any, and forgets it. */
  takeNavigation(): Promise<NavigationTarget | null>
}
