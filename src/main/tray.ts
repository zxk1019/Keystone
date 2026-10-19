import { app, Menu, Tray, type MenuItemConstructorOptions } from 'electron'
import type { EyeBreakCommand } from '@shared/api'
import type { EyeBreakStatus } from '@shared/eyeBreak'
import icon from '../../resources/icon.ico?asset'
import type { Translate } from './i18n'
import { showMainWindow } from './mainWindow'

// Kept at module level so the tray icon is not garbage collected
let tray: Tray | null = null
let eyeBreakCommand: (command: EyeBreakCommand) => void = () => {}

export function createTray(onEyeBreakCommand: (command: EyeBreakCommand) => void): void {
  eyeBreakCommand = onEyeBreakCommand
  tray = new Tray(icon)
  tray.setToolTip('Mi Estudio')
  tray.on('click', showMainWindow)
}

/** Pause or resume the 20-20-20, depending on its state */
function eyeBreakItems(t: Translate, status: EyeBreakStatus): MenuItemConstructorOptions[] {
  if (!status.enabled) return []
  if (status.pause) {
    return [{ label: t('tray.eyeResume'), click: () => eyeBreakCommand('resume') }]
  }
  return [
    {
      label: t('tray.eyePause'),
      submenu: [
        { label: t('tray.eyePause30'), click: () => eyeBreakCommand('pause30') },
        { label: t('tray.eyePause60'), click: () => eyeBreakCommand('pause60') },
        { label: t('tray.eyePauseRestart'), click: () => eyeBreakCommand('pauseRestart') }
      ]
    }
  ]
}

/** Rebuilds the menu, e.g. after the language changes or the 20-20-20 is paused. */
export function updateTrayMenu(t: Translate, status: EyeBreakStatus): void {
  const eyeBreak = eyeBreakItems(t, status)
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: t('tray.open'), click: showMainWindow },
      ...(eyeBreak.length > 0 ? [{ type: 'separator' as const }, ...eyeBreak] : []),
      { type: 'separator' },
      { label: t('tray.quit'), click: () => app.quit() }
    ])
  )
}

/** E.g. "Mi Estudio · Estudiando · quedan 23 min" while the study timer runs. */
export function setTrayStatus(status: string | null): void {
  tray?.setToolTip(status ? `Mi Estudio · ${status}` : 'Mi Estudio')
}
