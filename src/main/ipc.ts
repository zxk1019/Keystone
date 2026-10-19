import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC } from '@shared/api'
import type { Settings } from '@shared/types'
import { agendaOf, type ScheduleRepo, type SubjectsRepo } from './data/agendaRepos'
import { exportBackup, importBackup } from './data/backup'
import type { DataStore } from './data/dataStore'
import type { SettingsRepo } from './data/settingsRepo'
import { createTranslator } from './i18n'

interface IpcDeps {
  store: DataStore
  settings: SettingsRepo
  subjects: SubjectsRepo
  schedule: ScheduleRepo
  /** Called whenever the settings change, from the UI or from an imported backup. */
  onSettingsChanged: (settings: Settings) => void
}

function senderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('Window not found')
  return window
}

/** Sends a message to every open window. */
function broadcast(channel: string, payload?: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

export function broadcastSettings(settings: Settings): void {
  broadcast(IPC.settingsChanged, settings)
}

export function registerIpc({
  store,
  settings,
  subjects,
  schedule,
  onSettingsChanged
}: IpcDeps): void {
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
    if (result.status === 'imported') {
      onSettingsChanged(settings.get())
      broadcast(IPC.dataChanged)
    }
    return result
  })

  ipcMain.handle(IPC.getAgenda, () => agendaOf(store))
  ipcMain.handle(IPC.saveSubject, (_event, draft: unknown) => subjects.save(draft))
  ipcMain.handle(IPC.deleteSubject, (_event, id: unknown) => subjects.delete(id))
  ipcMain.handle(IPC.saveScheduleSlot, (_event, draft: unknown) => schedule.save(draft))
  ipcMain.handle(IPC.deleteScheduleSlot, (_event, id: unknown) => schedule.delete(id))
}
