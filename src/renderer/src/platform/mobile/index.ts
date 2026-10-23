import { App } from '@capacitor/app'
import { AppLauncher } from '@capacitor/app-launcher'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { NavigationTarget } from '@shared/api'
import type { EyeBreakStatus } from '@shared/eyeBreak'
import { FIREBASE_URLS, emulatorUrls } from '@shared/firebase'
import type { SpotifyResult } from '@shared/spotify'
import type { PhaseEvent, TimerState } from '@shared/studyTimer'
import type { SyncStatus } from '@shared/sync'
import type { Settings, ThemeSetting } from '@shared/types'
import { ItemsRepo, ScheduleRepo, SubjectsRepo, agendaOf } from '@core/data/agendaRepos'
import { DataStore } from '@core/data/dataStore'
import { SettingsRepo } from '@core/data/settingsRepo'
import { createTranslator, type Translate } from '@core/i18n'
import { StudyTimer } from '@core/studyTimer'
import { SyncService, parseSavedSession } from '@core/sync/service'
import type { Platform } from '..'
import { pickBackup, shareBackup } from './backup'
import { appFile } from './files'
import { MobileNotifier } from './notifications'

/*
 * The phone app (Capacitor). There is no main process: the core services (data, sync, timer)
 * run here, inside the app, and the reminders are handed to Android in advance.
 */

const SYNC_SESSION_KEY = 'sync-session'

/** A small event channel: what the PC sends from the main process with IPC. */
function channel<T>(): {
  emit: (value: T) => void
  listen: (listener: (value: T) => void) => () => void
} {
  const listeners = new Set<(value: T) => void>()
  return {
    emit: (value) => listeners.forEach((listener) => listener(value)),
    listen: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

const settingsChanged = channel<Settings>()
const dataChanged = channel<void>()
const navigate = channel<void>()
const studyState = channel<TimerState>()
const studyPhase = channel<PhaseEvent>()
const syncStatus = channel<SyncStatus>()
const backButton = new Set<() => boolean>()

let pendingTarget: NavigationTarget | null = null
let appInFront = true

interface Services {
  store: DataStore
  settings: SettingsRepo
  subjects: SubjectsRepo
  schedule: ScheduleRepo
  items: ItemsRepo
  studyTimer: StudyTimer
  sync: SyncService
  notifier: MobileNotifier
  translate: () => Translate
  /** The settings changed: here, from an imported backup or from another device */
  settingsUpdated: (settings: Settings) => void
}

const SYSTEM_BAR_STYLES: Record<ThemeSetting, SystemBarsStyle> = {
  light: SystemBarsStyle.Light,
  dark: SystemBarsStyle.Dark,
  system: SystemBarsStyle.Default
}

/** Light or dark icons in the status bar, to match the theme. */
function applySystemBars(theme: ThemeSetting): void {
  SystemBars.setStyle({ style: SYSTEM_BAR_STYLES[theme] }).catch(() => {
    // Not available outside Android (e.g. the phone version in a computer browser)
  })
}

function openTarget(target: NavigationTarget): void {
  pendingTarget = target
  navigate.emit()
}

async function start(): Promise<Services> {
  const store = await DataStore.open(appFile('mi-estudio-data.json'))
  const settings = new SettingsRepo(store)
  const items = new ItemsRepo(store)
  const translate = (): Translate => createTranslator(settings.get().language)

  const studyTimer: StudyTimer = new StudyTimer({
    durations: () => settings.get().study,
    onChange: (state) => {
      studyState.emit(state)
      // Reminders wait while studying, so they move with the timer
      notifier.planSoon()
    },
    onPhaseEvent: (event) => studyPhase.emit(event)
  })

  const notifier: MobileNotifier = new MobileNotifier({
    store,
    settings: () => settings.get(),
    studyTimer: () => studyTimer.get(),
    translate,
    onDone: (itemId) => {
      items.setDone(itemId, true)
      dataChanged.emit()
    },
    onOpen: openTarget
  })

  let language = settings.get().language
  const settingsUpdated = (current: Settings): void => {
    settingsChanged.emit(current)
    studyTimer.durationsChanged()
    sync.configChanged()
    applySystemBars(current.theme)
    if (current.language !== language) {
      language = current.language
      void notifier.languageChanged()
    }
  }

  // Development builds can use the Firebase emulator on the computer (10.0.2.2 from the
  // Android emulator); the builds for the user never set this
  const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR
  const savedSession = await Preferences.get({ key: SYNC_SESSION_KEY })
  const sync: SyncService = new SyncService({
    store,
    config: () => settings.get().sync,
    savedSession: parseSavedSession(savedSession.value ? JSON.parse(savedSession.value) : null),
    // Stored in the app's private storage, like the Firebase SDK does on Android
    sessions: {
      save: (session) =>
        void Preferences.set({ key: SYNC_SESSION_KEY, value: JSON.stringify(session) }),
      clear: () => void Preferences.remove({ key: SYNC_SESSION_KEY })
    },
    urls: emulatorHost ? emulatorUrls(emulatorHost) : FIREBASE_URLS,
    onStatus: syncStatus.emit,
    onRemoteChange: (change) => {
      if (change.settings) settingsUpdated(settings.get())
      if (change.agenda) dataChanged.emit()
      notifier.planSoon()
    }
  })

  // Any change of the agenda or of the shared settings moves the reminders
  store.onLocalChange(() => notifier.planSoon())

  await App.addListener('appStateChange', ({ isActive }) => {
    appInFront = isActive
    // The end of the study block comes as a notification while the app is not in front
    void notifier.studyInBackground(isActive ? null : studyTimer.get())
    if (!isActive) return
    studyTimer.catchUp()
    sync.windowFocused()
    notifier.planSoon()
  })
  await App.addListener('backButton', () => {
    const handled = [...backButton].some((callback) => callback())
    if (!handled) void App.minimizeApp()
  })

  applySystemBars(settings.get().theme)
  // Not awaited: the screens can open while Android asks for the notification permission
  void notifier.start()
  sync.start()

  return {
    store,
    settings,
    subjects: new SubjectsRepo(store),
    schedule: new ScheduleRepo(store),
    items,
    studyTimer,
    sync,
    notifier,
    translate,
    settingsUpdated
  }
}

const services = start()

/** Runs `run` once the services are ready (the data file is read when the app starts). */
async function withServices<T>(run: (services: Services) => T | Promise<T>): Promise<T> {
  return run(await services)
}

const NO_EYE_BREAK: EyeBreakStatus = { enabled: false, nextInMs: 0, pause: null, showing: false }
const NO_SPOTIFY: SpotifyResult<never> = { ok: false, error: 'notConfigured' }

/**
 * Opens the Spotify app, on a playlist if given ("spotify:playlist:..."). Without the app,
 * the same link on open.spotify.com opens in the browser.
 */
async function openSpotify(uri?: string): Promise<void> {
  const { completed } = await AppLauncher.openUrl({ url: uri ?? 'spotify:' })
  if (completed) return
  const path = uri ? uri.replace(/^spotify:/, '').replace(/:/g, '/') : ''
  await AppLauncher.openUrl({ url: `https://open.spotify.com/${path}` })
}

export const platform: Platform = {
  capabilities: { eyeBreak: false, startWithWindows: false, spotifyControl: false },
  onBackButton: (callback) => {
    backButton.add(callback)
    return () => backButton.delete(callback)
  },

  getSettings: () => withServices(({ settings }) => settings.get()),
  updateSettings: (patch) =>
    withServices(({ settings, settingsUpdated }) => {
      const updated = settings.update(patch)
      settingsUpdated(updated)
      return updated
    }),
  onSettingsChanged: settingsChanged.listen,
  exportData: () => withServices(({ store, translate }) => shareBackup(store.get(), translate())),
  importData: () =>
    withServices(async ({ store, settings, translate, settingsUpdated }) => {
      const data = await pickBackup()
      if (data === null) return { status: 'canceled' }
      if (data === 'invalid') return { status: 'invalid' }
      if (!window.confirm(translate()('dialog.importConfirm'))) return { status: 'canceled' }
      store.update(() => data)
      settingsUpdated(settings.get())
      dataChanged.emit()
      return { status: 'imported' }
    }),
  onDataChanged: (callback) => dataChanged.listen(callback),

  getAgenda: () => withServices(({ store }) => agendaOf(store)),
  saveSubject: (subject) => withServices(({ subjects }) => subjects.save(subject)),
  deleteSubject: (id) => withServices(({ subjects }) => subjects.delete(id)),
  saveScheduleSlot: (slot) => withServices(({ schedule }) => schedule.save(slot)),
  deleteScheduleSlot: (id) => withServices(({ schedule }) => schedule.delete(id)),
  saveItem: (item) => withServices(({ items }) => items.save(item)),
  setItemDone: (id, done) => withServices(({ items }) => items.setDone(id, done)),
  deleteItem: (id) => withServices(({ items }) => items.delete(id)),

  getAppInfo: async () => ({ packaged: true }),
  sendTestNotification: () => withServices(({ notifier }) => notifier.sendTest()),
  onNavigate: (callback) => navigate.listen(callback),
  takeNavigation: async () => {
    const target = pendingTarget
    pendingTarget = null
    return target
  },

  getStudyState: () => withServices(({ studyTimer }) => studyTimer.get()),
  studyCommand: (command) => withServices(({ studyTimer }) => studyTimer.command(command)),
  onStudyState: studyState.listen,
  // The chime only sounds with the app in front; in the background a notification says it
  onStudyPhase: (callback) =>
    studyPhase.listen((event) => {
      if (appInFront) callback(event)
    }),

  // The 20-20-20 is for the computer
  getEyeBreakStatus: async () => NO_EYE_BREAK,
  eyeBreakCommand: async () => NO_EYE_BREAK,
  onEyeBreakStatus: () => () => {},

  // On the phone the app only opens Spotify
  getSpotifyStatus: async () => ({ state: 'notConfigured' }),
  spotifyConnect: async () => NO_SPOTIFY,
  spotifyDisconnect: async () => {},
  spotifyPlayback: async () => NO_SPOTIFY,
  spotifyDevices: async () => NO_SPOTIFY,
  spotifyPlaylists: async () => NO_SPOTIFY,
  spotifyCommand: async (command) => {
    if (command.type === 'openApp') await openSpotify()
    else if (command.type === 'playPlaylist') await openSpotify(command.uri)
    else return NO_SPOTIFY
    return { ok: true, value: null }
  },
  onSpotifyStatus: () => () => {},

  getSyncStatus: () => withServices(({ sync }) => sync.status()),
  syncSignIn: (email, password, create) =>
    withServices(({ sync }) => sync.signIn(create ? 'signUp' : 'signIn', email.trim(), password)),
  syncSignOut: () => withServices(({ sync }) => sync.signOut()),
  syncResetPassword: (email) => withServices(({ sync }) => sync.resetPassword(email.trim())),
  syncNow: () => withServices(({ sync }) => sync.syncNow()),
  onSyncStatus: syncStatus.listen
}

// Test builds only (the ones for the Firebase emulator): the checks drive the app through
// window.miEstudio, as they use window.api on the PC. The builds for the user never have it.
if (import.meta.env.VITE_FIREBASE_EMULATOR) Object.assign(window, { miEstudio: platform })
