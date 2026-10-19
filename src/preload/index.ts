import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type DesktopApi } from '@shared/api'
import type { Settings } from '@shared/types'

// The only bridge between the UI and the main process: the UI never touches Node or the disk
const api: DesktopApi = {
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.updateSettings, patch),
  onSettingsChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, settings: Settings): void => callback(settings)
    ipcRenderer.on(IPC.settingsChanged, listener)
    return () => ipcRenderer.removeListener(IPC.settingsChanged, listener)
  },
  exportData: () => ipcRenderer.invoke(IPC.exportData),
  importData: () => ipcRenderer.invoke(IPC.importData)
}

contextBridge.exposeInMainWorld('api', api)
