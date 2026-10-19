import { app } from 'electron'

/** Passed when Windows starts the app at login, so it opens hidden in the tray */
export const HIDDEN_FLAG = '--hidden'

export function startsHidden(): boolean {
  return process.argv.includes(HIDDEN_FLAG)
}

/**
 * Adds or removes the app from the programs that start with Windows. Only the installed app
 * registers itself: in development the entry would point to the bare Electron program.
 */
export function applyStartWithWindows(enabled: boolean): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled, args: [HIDDEN_FLAG] })
}
