import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type DesktopApi } from '@shared/api'
import type { EyeBreakStatus } from '@shared/eyeBreak'
import type { SpotifyStatus } from '@shared/spotify'
import type { PhaseEvent, TimerState } from '@shared/studyTimer'
import type { SyncStatus } from '@shared/sync'
import type { UpdateStatus } from '@shared/updates'
import type { Settings } from '@shared/types'

/** Subscribes to a channel and returns the function that unsubscribes. */
function listen<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// The only bridge between the UI and the main process: the UI never touches Node or the disk
const api: DesktopApi = {
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.updateSettings, patch),
  onSettingsChanged: (callback) => listen<Settings>(IPC.settingsChanged, callback),
  exportData: () => ipcRenderer.invoke(IPC.exportData),
  importData: () => ipcRenderer.invoke(IPC.importData),
  onDataChanged: (callback) => listen(IPC.dataChanged, () => callback()),

  getAgenda: () => ipcRenderer.invoke(IPC.getAgenda),
  saveSubject: (subject) => ipcRenderer.invoke(IPC.saveSubject, subject),
  deleteSubject: (id) => ipcRenderer.invoke(IPC.deleteSubject, id),
  saveScheduleSlot: (slot) => ipcRenderer.invoke(IPC.saveScheduleSlot, slot),
  deleteScheduleSlot: (id) => ipcRenderer.invoke(IPC.deleteScheduleSlot, id),
  saveItem: (item) => ipcRenderer.invoke(IPC.saveItem, item),
  setItemDone: (id, done) => ipcRenderer.invoke(IPC.setItemDone, id, done),
  deleteItem: (id) => ipcRenderer.invoke(IPC.deleteItem, id),
  getHabits: () => ipcRenderer.invoke(IPC.getHabits),
  saveHabit: (habit) => ipcRenderer.invoke(IPC.saveHabit, habit),
  deleteHabit: (id) => ipcRenderer.invoke(IPC.deleteHabit, id),
  setHabitMark: (habitId, date, status) =>
    ipcRenderer.invoke(IPC.setHabitMark, habitId, date, status),

  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  sendTestNotification: () => ipcRenderer.invoke(IPC.sendTestNotification),
  onNavigate: (callback) => listen(IPC.navigate, () => callback()),
  takeNavigation: () => ipcRenderer.invoke(IPC.takeNavigation),

  getStudyState: () => ipcRenderer.invoke(IPC.getStudyState),
  studyCommand: (command) => ipcRenderer.invoke(IPC.studyCommand, command),
  onStudyState: (callback) => listen<TimerState>(IPC.studyState, callback),
  onStudyPhase: (callback) => listen<PhaseEvent>(IPC.studyPhase, callback),

  getEyeBreakStatus: () => ipcRenderer.invoke(IPC.getEyeBreakStatus),
  eyeBreakCommand: (command) => ipcRenderer.invoke(IPC.eyeBreakCommand, command),
  onEyeBreakStatus: (callback) => listen<EyeBreakStatus>(IPC.eyeBreakStatus, callback),

  getSpotifyStatus: () => ipcRenderer.invoke(IPC.spotifyStatus),
  spotifyConnect: () => ipcRenderer.invoke(IPC.spotifyConnect),
  spotifyDisconnect: () => ipcRenderer.invoke(IPC.spotifyDisconnect),
  spotifyPlayback: () => ipcRenderer.invoke(IPC.spotifyPlayback),
  spotifyDevices: () => ipcRenderer.invoke(IPC.spotifyDevices),
  spotifyPlaylists: () => ipcRenderer.invoke(IPC.spotifyPlaylists),
  spotifyCommand: (command) => ipcRenderer.invoke(IPC.spotifyCommand, command),
  onSpotifyStatus: (callback) => listen<SpotifyStatus>(IPC.spotifyStatusChanged, callback),

  getSyncStatus: () => ipcRenderer.invoke(IPC.syncStatus),
  syncSignIn: (email, password, create) =>
    ipcRenderer.invoke(IPC.syncSignIn, email, password, create),
  syncSignOut: () => ipcRenderer.invoke(IPC.syncSignOut),
  syncResetPassword: (email) => ipcRenderer.invoke(IPC.syncResetPassword, email),
  syncNow: () => ipcRenderer.invoke(IPC.syncNow),
  onSyncStatus: (callback) => listen<SyncStatus>(IPC.syncStatusChanged, callback),

  getUpdateStatus: () => ipcRenderer.invoke(IPC.updateStatus),
  checkForUpdates: () => ipcRenderer.invoke(IPC.checkForUpdates),
  installUpdate: () => ipcRenderer.invoke(IPC.installUpdate),
  onUpdateStatus: (callback) => listen<UpdateStatus>(IPC.updateStatusChanged, callback)
}

contextBridge.exposeInMainWorld('api', api)
