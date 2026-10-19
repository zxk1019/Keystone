import { app, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC } from '@shared/api'
import { isStudying } from '@shared/studyTimer'
import type { Settings } from '@shared/types'
import { ItemsRepo, ScheduleRepo, SubjectsRepo } from './data/agendaRepos'
import { DataStore } from './data/dataStore'
import { NotificationLog } from './data/notificationLog'
import { SettingsRepo } from './data/settingsRepo'
import { createTranslator } from './i18n'
import { broadcast, broadcastSettings, registerIpc } from './ipc'
import { createMainWindow, isMainWindowInFront, showMainWindow } from './mainWindow'
import { openTarget } from './navigation'
import { Notifier } from './notifier'
import { applyStartWithWindows, startsHidden } from './startup'
import { StudyTimer } from './studyTimer'
import { phaseNotification, trayStatus } from './studyText'
import { createTray, setTrayStatus, updateTrayMenu } from './tray'

const APP_ID = 'com.miestudio.app'

// A separate data folder for tests and experiments, so they never touch the real data:
// MI_ESTUDIO_DATA_DIR=C:\temp\pruebas npm run dev
const customDataDir = process.env['MI_ESTUDIO_DATA_DIR']
if (customDataDir) app.setPath('userData', customDataDir)

// Only one copy of the app can run; opening it again just shows the existing window
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)
  // Without a window the app keeps running in the tray; it only quits from the tray menu
  app.on('window-all-closed', () => {})
  app.whenReady().then(start)
}

function start(): void {
  // Needed on Windows so notifications show the app name
  electronApp.setAppUserModelId(APP_ID)

  // F12 opens DevTools in development; Ctrl+R reload is disabled in production
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  const userData = app.getPath('userData')
  const store = new DataStore(join(userData, 'mi-estudio-data.json'))
  const settings = new SettingsRepo(store)
  const notifier = new Notifier({
    store,
    settings,
    log: new NotificationLog(join(userData, 'mi-estudio-avisos.json')),
    isStudying: () => isStudying(studyTimer.get()),
    open: openTarget
  })

  const translator = (): ReturnType<typeof createTranslator> =>
    createTranslator(settings.get().language)
  const refreshTrayStatus = (): void =>
    setTrayStatus(trayStatus(studyTimer.get(), Date.now(), translator()))

  let wasStudying = false
  const studyTimer = new StudyTimer({
    durations: () => settings.get().study,
    onChange: (state) => {
      broadcast(IPC.studyState, state)
      refreshTrayStatus()
      // Reminders held back during the study block go out as soon as it ends
      const studying = isStudying(state)
      if (wasStudying && !studying) notifier.check()
      wasStudying = studying
    },
    onPhaseEvent: (event, state) => {
      broadcast(IPC.studyPhase, event)
      if (!isMainWindowInFront()) notifier.show(phaseNotification(event, state, translator()))
    }
  })

  const applySettings = (current: Settings): void => {
    // Also drives prefers-color-scheme in the renderer and the color of the title bar
    nativeTheme.themeSource = current.theme
    updateTrayMenu(createTranslator(current.language))
    applyStartWithWindows(current.startWithWindows)
  }

  registerIpc({
    store,
    settings,
    subjects: new SubjectsRepo(store),
    schedule: new ScheduleRepo(store),
    items: new ItemsRepo(store),
    notifier,
    studyTimer,
    onSettingsChanged: (current) => {
      applySettings(current)
      broadcastSettings(current)
      studyTimer.durationsChanged()
      refreshTrayStatus()
      // E.g. notifications were just turned on, or the summary time moved to now
      notifier.check()
    }
  })

  createTray(createTranslator(settings.get().language))
  applySettings(settings.get())
  createMainWindow({ show: !startsHidden() })
  notifier.start()
  // Keeps the minutes in the tray tooltip up to date
  setInterval(refreshTrayStatus, 15_000)
}
