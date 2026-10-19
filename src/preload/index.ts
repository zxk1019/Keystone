import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type DesktopApi } from '@shared/api'
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

  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  sendTestNotification: () => ipcRenderer.invoke(IPC.sendTestNotification),
  onNavigate: (callback) => listen(IPC.navigate, () => callback()),
  takeNavigation: () => ipcRenderer.invoke(IPC.takeNavigation)
}

contextBridge.exposeInMainWorld('api', api)
