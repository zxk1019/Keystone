import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC } from '@shared/api'
import type { Settings } from '@shared/types'
import { exportBackup, importBackup } from './data/backup'
import type { DataStore } from './data/dataStore'
import type { SettingsRepo } from './data/settingsRepo'
import { createTranslator } from './i18n'

interface IpcDeps {
  store: DataStore
  settings: SettingsRepo
  /** Called whenever the settings change, from the UI or from an imported backup. */
  onSettingsChanged: (settings: Settings) => void
}

function senderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('Window not found')
  return window
}

export function registerIpc({ store, settings, onSettingsChanged }: IpcDeps): void {
  const translator = (): ReturnType<typeof createTranslator> =>
    createTranslator(settings.get().language)

  ipcMain.handle(IPC.getSettings, () => settings.get())

  ipcMain.handle(IPC.updateSettings, (_event, patch: unknown) => {
    const updated = settings.update(patch)
    onSettingsChanged(updated)
    return updated
  })

  ipcMain.handle(IPC.exportData, (event) => exportBackup(senderWindow(event), store, translator()))

  ipcMain.handle(IPC.importData, async (event) => {
    const result = await importBackup(senderWindow(event), store, translator())
    if (result.status === 'imported') onSettingsChanged(settings.get())
    return result
  })
}

/** Sends the new settings to every open window. */
export function broadcastSettings(settings: Settings): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC.settingsChanged, settings)
  }
}
