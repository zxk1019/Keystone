import { app, Menu, Tray } from 'electron'
import icon from '../../resources/icon.ico?asset'
import type { Translate } from './i18n'
import { showMainWindow } from './mainWindow'

// Kept at module level so the tray icon is not garbage collected
let tray: Tray | null = null

export function createTray(t: Translate): void {
  tray = new Tray(icon)
  tray.setToolTip('Mi Estudio')
  tray.on('click', showMainWindow)
  updateTrayMenu(t)
}

/** Rebuilds the menu, e.g. after the language changes. */
export function updateTrayMenu(t: Translate): void {
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: t('tray.open'), click: showMainWindow },
      { type: 'separator' },
      { label: t('tray.quit'), click: () => app.quit() }
    ])
  )
}
