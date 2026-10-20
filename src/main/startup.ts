import { app } from 'electron'
import { APP_PROTOCOL } from '@shared/appUrl'

/** Passed when Windows starts the app at login, so it opens hidden in the tray */
export const HIDDEN_FLAG = '--hidden'

/**
 * A run with a separate data folder (MI_ESTUDIO_DATA_DIR) is a test: it must not register
 * anything with Windows, not even from the installed app.
 */
export function isTestRun(): boolean {
  return Boolean(process.env['MI_ESTUDIO_DATA_DIR'])
}

/** Only the installed app, outside tests, may register itself with Windows. */
function mayRegister(): boolean {
  return app.isPackaged && !isTestRun()
}

export function startsHidden(): boolean {
  return process.argv.includes(HIDDEN_FLAG)
}

/**
 * Adds or removes the app from the programs that start with Windows. Only the installed app
 * registers itself: in development the entry would point to the bare Electron program.
 */
export function applyStartWithWindows(enabled: boolean): void {
  if (!mayRegister()) return
  app.setLoginItemSettings({ openAtLogin: enabled, args: [HIDDEN_FLAG] })
}

/** Makes Windows open miestudio:// links (the buttons of the notifications) with this app. */
export function registerAppProtocol(): void {
  if (mayRegister()) app.setAsDefaultProtocolClient(APP_PROTOCOL)
}

/** Rich notifications rely on the miestudio:// link, so they need the registration above. */
export function canUseRichToasts(): boolean {
  return mayRegister()
}
