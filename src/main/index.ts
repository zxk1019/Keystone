import { app, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC } from '@shared/api'
import { findAppUrl, parseAppUrl } from '@shared/appUrl'
import type { EyeBreakStatus } from '@shared/eyeBreak'
import { FIREBASE_URLS, emulatorUrls } from '@shared/firebase'
import { isStudying, studyPlan, type TimerState } from '@shared/studyTimer'
import { DEVICE_STUDY_MODE, type Settings } from '@shared/types'
import { ItemsRepo, ScheduleRepo, SubjectsRepo } from '@core/data/agendaRepos'
import { DataStore } from '@core/data/dataStore'
import { HabitsRepo } from '@core/data/habitsRepo'
import { SettingsRepo } from '@core/data/settingsRepo'
import { createTranslator } from '@core/i18n'
import { phaseNotification, trayStatus } from '@core/studyText'
import { StudyTimer } from '@core/studyTimer'
import { SyncService } from '@core/sync/service'
import { nodeTextFile } from './data/nodeTextFile'
import { NotificationLog } from './data/notificationLog'
import { EyeBreakService } from './eyeBreak'
import { isUserBusy } from './fullscreen'
import { broadcast, broadcastSettings, registerIpc } from './ipc'
import { createMainWindow, isMainWindowInFront, showMainWindow } from './mainWindow'
import { openTarget } from './navigation'
import { Notifier } from './notifier'
import { SpotifyService } from './spotify/service'
import { TokenStore } from './spotify/tokenStore'
import {
  applyStartWithWindows,
  canUseRichToasts,
  registerAppProtocol,
  startsHidden
} from './startup'
import { SecureSyncSessionStore } from './sync/sessionStore'
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

async function start(): Promise<void> {
  // Needed on Windows so notifications show the app name
  electronApp.setAppUserModelId(APP_ID)

  // F12 opens DevTools in development; Ctrl+R reload is disabled in production
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  const userData = app.getPath('userData')
  const store = await DataStore.open(nodeTextFile(join(userData, 'mi-estudio-data.json')))
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
    plan: () => studyPlan(settings.get(), DEVICE_STUDY_MODE.desktop),
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
        // 20 seconds looking far away are no reason to stop the music
        if (!state.eyeRest) spotify.onStudyEvent('breakStarted')
      }
      const notification = phaseNotification(event, state, translator())
      if (notification && !isMainWindowInFront()) notifier.show(notification)
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
    studyTimer.planChanged()
    eyeBreak.settingsChanged()
    spotify.settingsChanged()
    sync.configChanged()
    refreshTrayStatus()
    // E.g. notifications were just turned on, or the summary time moved to now
    notifier.check()
  }

  // Development tests can use the local Firebase emulator; the installed app never can
  const emulatorHost = !app.isPackaged && process.env['MI_ESTUDIO_FIREBASE_EMULATOR']
  const syncSessions = new SecureSyncSessionStore(join(userData, 'mi-estudio-sync.bin'))
  const sync = new SyncService({
    store,
    config: () => settings.get().sync,
    savedSession: syncSessions.load(),
    sessions: syncSessions,
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
    habits: new HabitsRepo(store),
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
