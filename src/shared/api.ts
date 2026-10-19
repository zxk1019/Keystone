import type { Settings } from './types'

/** IPC channel names used between the preload script and the main process. */
export const IPC = {
  getSettings: 'settings:get',
  updateSettings: 'settings:update',
  settingsChanged: 'settings:changed',
  exportData: 'data:export',
  importData: 'data:import'
} as const

export type ExportResult = { status: 'saved'; path: string } | { status: 'canceled' }

export type ImportResult = { status: 'imported' } | { status: 'canceled' } | { status: 'invalid' }

/** What the preload script exposes to the renderer as `window.api`. */
export interface DesktopApi {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  /** Returns a function that stops listening. */
  onSettingsChanged(callback: (settings: Settings) => void): () => void
  exportData(): Promise<ExportResult>
  importData(): Promise<ImportResult>
}
