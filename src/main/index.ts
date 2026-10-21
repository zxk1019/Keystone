import { app, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC } from '@shared/api'
import { findAppUrl, parseAppUrl } from '@shared/appUrl'
import type { EyeBreakStatus } from '@shared/eyeBreak'
import { FIREBASE_URLS, emulatorUrls } from '@shared/firebase'
import { isStudying, type TimerState } from '@shared/studyTimer'
import type { Settings } from '@shared/types'
import { ItemsRepo, ScheduleRepo, SubjectsRepo } from './data/agendaRepos'
import { DataStore } from './data/dataStore'
import { NotificationLog } from './data/notificationLog'
import { SettingsRepo } from './data/settingsRepo'
import { EyeBreakService } from './eyeBreak'
import { isUserBusy } from './fullscreen'
import { createTranslator } from './i18n'
import { broadcast, broadcastSettings, registerIpc } from './ipc'
import { createMainWindow, isMainWindowInFront, showMainWindow } from './mainWindow'
import { openTarget } from './navigation'
import { Notifier } from './notifier'
import { SpotifyService } from './spotify/service'
import { TokenStore } from './spotify/tokenStore'
import { SyncService } from './sync/service'
import { SyncSessionStore } from './sync/sessionStore'
import {
  applyStartWithWindows,
  canUseRichToasts,
  registerAppProtocol,
  startsHidden
} from './startup'
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
  const items = new ItemsRepo(store)
  const notifier = new Notifier({
    store,
    settings,
    log: new NotificationLog(join(userData, 'mi-estudio-avisos.json')),
    isStudying: () => isStudying(studyTimer.get()),
    open: openTarget,
    richToasts: canUseRichToasts()
  })

  const translator = (): ReturnType<typeof createTranslator> =>
    createTranslator(settings.get().language)
  const refreshTrayStatus = (): void =>
    setTrayStatus(trayStatus(studyTimer.get(), Date.now(), translator()))

  const spotify = new SpotifyService({
    settings: () => settings.get().spotify,
    store: new TokenStore(join(userData, 'mi-estudio-spotify.bin')),
    // Development tests can point the app at a fake Spotify; the installed app never can
    urls: {
      accounts:
        (!app.isPackaged && process.env['MI_ESTUDIO_SPOTIFY_ACCOUNTS']) ||
        'https://accounts.spotify.com',
      api:
        (!app.isPackaged && process.env['MI_ESTUDIO_SPOTIFY_API']) || 'https://api.spotify.com/v1'
    },
    translate: translator,
    onStatus: (status) => broadcast(IPC.spotifyStatusChanged, status)
  })

  let wasStudying = false
  let previousTimer: TimerState | null = null
  const studyTimer = new StudyTimer({
    durations: () => settings.get().study,
    onChange: (state) => {
      broadcast(IPC.studyState, state)
      refreshTrayStatus()
      // Reminders held back during the study block go out as soon as it ends
      const studying = isStudying(state)
      if (wasStudying && !studying) notifier.check()
      wasStudying = studying
      // A new study block (not resuming from a pause) brings the music back
      if (previousTimer?.status === 'idle' && studying) spotify.onStudyEvent('blockStarted')
      previousTimer = state
    },
    onPhaseEvent: (event, state) => {
      broadcast(IPC.studyPhase, event)
      // A study break rests the eyes too
      if (event === 'breakStarted') {
        eyeBreak.restart()
        spotify.onStudyEvent('breakStarted')
      }
      if (!isMainWindowInFront()) notifier.show(phaseNotification(event, state, translator()))
    }
  })

  previousTimer = studyTimer.get()

  // The tray menu only changes when the 20-20-20 is turned on/off or paused/resumed
  let trayMenuKey = ''
  const refreshTrayMenu = (status: EyeBreakStatus, force = false): void => {
    const key = `${settings.get().language}|${status.enabled}|${status.pause ? 'paused' : 'on'}`
    if (!force && key === trayMenuKey) return
    trayMenuKey = key
    updateTrayMenu(translator(), status)
  }

  const eyeBreak = new EyeBreakService({
    settings: () => settings.get().eyeBreak,
    study: () => studyTimer.get(),
    isBusy: isUserBusy,
    onStatus: (status) => {
      broadcast(IPC.eyeBreakStatus, status)
      refreshTrayMenu(status)
    }
  })

  const applySettings = (current: Settings): void => {
    // Also drives prefers-color-scheme in the renderer and the color of the title bar
    nativeTheme.themeSource = current.theme
    refreshTrayMenu(eyeBreak.status(), true)
    applyStartWithWindows(current.startWithWindows)
  }

  /** The settings changed: from the UI, an imported backup or another device. */
  const onSettingsChanged = (current: Settings): void => {
    applySettings(current)
    broadcastSettings(current)
    studyTimer.durationsChanged()
    eyeBreak.settingsChanged()
    spotify.settingsChanged()
    sync.configChanged()
    refreshTrayStatus()
    // E.g. notifications were just turned on, or the summary time moved to now
    notifier.check()
  }

  // Development tests can use the local Firebase emulator; the installed app never can
  const emulatorHost = !app.isPackaged && process.env['MI_ESTUDIO_FIREBASE_EMULATOR']
  const sync = new SyncService({
    store,
    config: () => settings.get().sync,
    sessions: new SyncSessionStore(join(userData, 'mi-estudio-sync.bin')),
    urls: emulatorHost ? emulatorUrls(emulatorHost) : FIREBASE_URLS,
    onStatus: (status) => broadcast(IPC.syncStatusChanged, status),
    onRemoteChange: (change) => {
      if (change.settings) onSettingsChanged(settings.get())
      if (change.agenda) {
        broadcast(IPC.dataChanged)
        // E.g. a task marked as done on the phone no longer needs a reminder here
        notifier.check()
      }
    }
  })
  // Coming back to the window is a good moment to pick up what changed on the phone
  app.on('browser-window-focus', () => sync.windowFocused())

  registerIpc({
    store,
    settings,
    subjects: new SubjectsRepo(store),
    schedule: new ScheduleRepo(store),
    items,
    notifier,
    studyTimer,
    eyeBreak,
    spotify,
    sync,
    onSettingsChanged
  })

  /** A miestudio:// link from a notification: mark a task done or open a screen. */
  const handleAppUrl = (url: string | undefined): boolean => {
    const parsed = url ? parseAppUrl(url) : null
    if (!parsed) return false
    if (parsed.action === 'done') {
      items.setDone(parsed.itemId, true)
      broadcast(IPC.dataChanged)
    } else {
      openTarget(parsed.target)
    }
    return true
  }
  // Opening the app again (or a link while it runs) reaches the copy that is already open
  app.on('second-instance', (_event, argv) => {
    if (!handleAppUrl(findAppUrl(argv))) showMainWindow()
  })

  registerAppProtocol()
  createTray((command) => eyeBreak.command(command))
  applySettings(settings.get())
  // A "Done" link that starts the app does its job without showing the window
  const startUrl = findAppUrl(process.argv)
  const startsWithDone = parseAppUrl(startUrl ?? '')?.action === 'done'
  createMainWindow({ show: !startsHidden() && !startsWithDone })
  handleAppUrl(startUrl)
  notifier.start()
  eyeBreak.start()
  sync.start()
  // Keeps the minutes in the tray tooltip up to date
  setInterval(refreshTrayStatus, 15_000)
}
