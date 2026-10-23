import type { EyeBreakStatus } from './eyeBreak'
import type {
  SpotifyCommand,
  SpotifyDevice,
  SpotifyPlayback,
  SpotifyPlaylist,
  SpotifyResult,
  SpotifyStatus
} from './spotify'
import type { PhaseEvent, TimerCommand, TimerState } from './studyTimer'
import type { SyncResult } from './firebase'
import type { SyncStatus } from './sync'
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
  takeNavigation: 'app:take-navigation',
  getStudyState: 'study:get',
  studyCommand: 'study:command',
  studyState: 'study:state',
  studyPhase: 'study:phase',
  getEyeBreakStatus: 'eye-break:get',
  eyeBreakCommand: 'eye-break:command',
  eyeBreakStatus: 'eye-break:status',
  spotifyStatus: 'spotify:status',
  spotifyConnect: 'spotify:connect',
  spotifyDisconnect: 'spotify:disconnect',
  spotifyPlayback: 'spotify:playback',
  spotifyDevices: 'spotify:devices',
  spotifyPlaylists: 'spotify:playlists',
  spotifyCommand: 'spotify:command',
  spotifyStatusChanged: 'spotify:status-changed',
  syncStatus: 'sync:status',
  syncSignIn: 'sync:sign-in',
  syncSignOut: 'sync:sign-out',
  syncResetPassword: 'sync:reset-password',
  syncNow: 'sync:now',
  syncStatusChanged: 'sync:status-changed'
} as const

/** 'shared': on the phone the copy goes to the Android share menu (Drive, email...) */
export type ExportResult =
  { status: 'saved'; path: string } | { status: 'shared' } | { status: 'canceled' }

export type ImportResult = { status: 'imported' } | { status: 'canceled' } | { status: 'invalid' }

/** Where to take the user, e.g. after clicking a notification */
export interface NavigationTarget {
  section: 'today' | 'tasks' | 'agenda' | 'study'
  /** Open this item's dialog */
  itemId?: string
  /** Show this filter on the Tasks screen */
  tasksStatus?: 'overdue'
}

/** finish/skip close the dark screen; test shows it now; the rest pause or resume the 20-20-20 */
export type EyeBreakCommand =
  'finish' | 'skip' | 'test' | 'resume' | 'pause30' | 'pause60' | 'pauseRestart'

export const EYE_BREAK_COMMANDS: EyeBreakCommand[] = [
  'finish',
  'skip',
  'test',
  'resume',
  'pause30',
  'pause60',
  'pauseRestart'
]

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

  getStudyState(): Promise<TimerState>
  studyCommand(command: TimerCommand): Promise<TimerState>
  onStudyState(callback: (state: TimerState) => void): () => void
  /** Fires when a break starts or ends, to play the chime */
  onStudyPhase(callback: (event: PhaseEvent) => void): () => void

  getEyeBreakStatus(): Promise<EyeBreakStatus>
  eyeBreakCommand(command: EyeBreakCommand): Promise<EyeBreakStatus>
  onEyeBreakStatus(callback: (status: EyeBreakStatus) => void): () => void

  getSpotifyStatus(): Promise<SpotifyStatus>
  /** Opens the Spotify login in the browser and waits for it to finish */
  spotifyConnect(): Promise<SpotifyResult<SpotifyStatus>>
  spotifyDisconnect(): Promise<void>
  spotifyPlayback(): Promise<SpotifyResult<SpotifyPlayback | null>>
  spotifyDevices(): Promise<SpotifyResult<SpotifyDevice[]>>
  spotifyPlaylists(): Promise<SpotifyResult<SpotifyPlaylist[]>>
  spotifyCommand(command: SpotifyCommand): Promise<SpotifyResult<null>>
  onSpotifyStatus(callback: (status: SpotifyStatus) => void): () => void

  getSyncStatus(): Promise<SyncStatus>
  /** Signs in to an existing account, or creates it with `create` */
  syncSignIn(email: string, password: string, create: boolean): Promise<SyncResult<SyncStatus>>
  syncSignOut(): Promise<void>
  /** Firebase emails a link to choose a new password */
  syncResetPassword(email: string): Promise<SyncResult<null>>
  syncNow(): Promise<SyncStatus>
  onSyncStatus(callback: (status: SyncStatus) => void): () => void
}
