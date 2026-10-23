import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { EYE_BREAK_COMMANDS, IPC, type EyeBreakCommand } from '@shared/api'
import { parseSpotifyCommand } from '@shared/spotify'
import type { Settings } from '@shared/types'
import {
  agendaOf,
  type ItemsRepo,
  type ScheduleRepo,
  type SubjectsRepo
} from '@core/data/agendaRepos'
import { exportBackup, importBackup } from './data/backup'
import type { EyeBreakService } from './eyeBreak'
import type { SpotifyService } from './spotify/service'
import type { SyncService } from '@core/sync/service'
import type { DataStore } from '@core/data/dataStore'
import type { SettingsRepo } from '@core/data/settingsRepo'
import { createTranslator } from '@core/i18n'
import { takeNavigation } from './navigation'
import type { Notifier } from './notifier'
import type { StudyTimer } from '@core/studyTimer'

interface IpcDeps {
  store: DataStore
  settings: SettingsRepo
  subjects: SubjectsRepo
  schedule: ScheduleRepo
  items: ItemsRepo
  notifier: Notifier
  studyTimer: StudyTimer
  eyeBreak: EyeBreakService
  spotify: SpotifyService
  sync: SyncService
  /** Called whenever the settings change, from the UI or from an imported backup. */
  onSettingsChanged: (settings: Settings) => void
}

function senderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('Window not found')
  return window
}

/** Sends a message to every open window. */
export function broadcast(channel: string, payload?: unknown): void {
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
  studyTimer,
  eyeBreak,
  spotify,
  sync,
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

  ipcMain.handle(IPC.getStudyState, () => studyTimer.get())
  ipcMain.handle(IPC.studyCommand, (_event, command: unknown) => {
    if (command !== 'start' && command !== 'pause' && command !== 'skip' && command !== 'reset') {
      throw new Error('Unknown timer command')
    }
    return studyTimer.command(command)
  })

  ipcMain.handle(IPC.getEyeBreakStatus, () => eyeBreak.status())
  ipcMain.handle(IPC.eyeBreakCommand, (_event, command: unknown) => {
    if (!EYE_BREAK_COMMANDS.includes(command as EyeBreakCommand)) {
      throw new Error('Unknown eye break command')
    }
    return eyeBreak.command(command as EyeBreakCommand)
  })

  ipcMain.handle(IPC.spotifyStatus, () => spotify.status())
  ipcMain.handle(IPC.spotifyConnect, () => spotify.connect())
  ipcMain.handle(IPC.spotifyDisconnect, () => spotify.disconnect())
  ipcMain.handle(IPC.spotifyPlayback, () => spotify.playback())
  ipcMain.handle(IPC.spotifyDevices, () => spotify.devices())
  ipcMain.handle(IPC.spotifyPlaylists, () => spotify.playlists())
  ipcMain.handle(IPC.spotifyCommand, (_event, value: unknown) => {
    const command = parseSpotifyCommand(value)
    if (!command) throw new Error('Unknown Spotify command')
    return spotify.command(command)
  })

  ipcMain.handle(IPC.syncStatus, () => sync.status())
  ipcMain.handle(IPC.syncSignIn, (_event, email: unknown, password: unknown, create: unknown) => {
    if (!isCredential(email) || !isCredential(password) || typeof create !== 'boolean') {
      throw new Error('Invalid credentials')
    }
    return sync.signIn(create ? 'signUp' : 'signIn', email.trim(), password)
  })
  ipcMain.handle(IPC.syncSignOut, () => sync.signOut())
  ipcMain.handle(IPC.syncResetPassword, (_event, email: unknown) => {
    if (!isCredential(email)) throw new Error('Invalid email')
    return sync.resetPassword(email.trim())
  })
  ipcMain.handle(IPC.syncNow, () => sync.syncNow())
}

/** Firebase checks the email and the password itself; here only that they are sensible text. */
function isCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 1000
}
