import { IPC, type NavigationTarget } from '@shared/api'
import { showMainWindow } from './mainWindow'

// Kept until the page asks for it: if the window had to be created, the page is not listening yet
let pending: NavigationTarget | null = null

/** Shows the window and takes the user to `target` (used when a notification is clicked). */
export function openTarget(target: NavigationTarget): void {
  pending = target
  const window = showMainWindow()
  // A page that is already running picks it up now; a new one asks for it when it starts
  window.webContents.send(IPC.navigate)
}

export function takeNavigation(): NavigationTarget | null {
  const target = pending
  pending = null
  return target
}
