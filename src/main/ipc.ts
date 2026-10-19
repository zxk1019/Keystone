import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC } from '@shared/api'
import type { Settings } from '@shared/types'
import { agendaOf, type ItemsRepo, type ScheduleRepo, type SubjectsRepo } from './data/agendaRepos'
import { exportBackup, importBackup } from './data/backup'
import type { DataStore } from './data/dataStore'
import type { SettingsRepo } from './data/settingsRepo'
import { createTranslator } from './i18n'
import { takeNavigation } from './navigation'
import type { Notifier } from './notifier'

interface IpcDeps {
  store: DataStore
  settings: SettingsRepo
  subjects: SubjectsRepo
  schedule: ScheduleRepo
  items: ItemsRepo
  notifier: Notifier
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
  items,
  notifier,
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
  ipcMain.handle(IPC.saveItem, (_event, draft: unknown) => items.save(draft))
  ipcMain.handle(IPC.setItemDone, (_event, id: unknown, done: unknown) => items.setDone(id, done))
  ipcMain.handle(IPC.deleteItem, (_event, id: unknown) => items.delete(id))

  ipcMain.handle(IPC.getAppInfo, () => ({ packaged: app.isPackaged }))
  ipcMain.handle(IPC.sendTestNotification, () => notifier.sendTest())
  ipcMain.handle(IPC.takeNavigation, () => takeNavigation())
}
