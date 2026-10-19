import { app, BrowserWindow, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'

// Same colors as the app background in main.css, so the window never flashes white in dark mode
const BACKGROUND = { light: '#ffffff', dark: '#09090b' }

let mainWindow: BrowserWindow | null = null
let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
})

function backgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light
}

/** `show: false` keeps the window hidden, e.g. when the app starts with Windows. */
export function createMainWindow({ show = true }: { show?: boolean } = {}): BrowserWindow {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    show: false,
    title: 'Mi Estudio',
    icon,
    autoHideMenuBar: true,
    backgroundColor: backgroundColor(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    if (show) window.show()
  })

  // Closing the window only hides it: the app keeps running in the tray (needed for reminders)
  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      window.hide()
    }
  })

  // Links open in the default browser, never inside the app
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  const updateBackground = (): void => window.setBackgroundColor(backgroundColor())
  nativeTheme.on('updated', updateBackground)

  window.on('closed', () => {
    nativeTheme.off('updated', updateBackground)
    if (mainWindow === window) mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

export function showMainWindow(): BrowserWindow {
  // The window can be destroyed without the app quitting (e.g. the page called window.close())
  if (!mainWindow) return createMainWindow()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  return mainWindow
}

/** Whether the user is looking at the app right now. */
export function isMainWindowInFront(): boolean {
  return Boolean(mainWindow && mainWindow.isVisible() && mainWindow.isFocused())
}
