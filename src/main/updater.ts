import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { UPDATE_CHECK_INTERVAL_MS, type UpdateStatus } from '@shared/updates'
import { isTestRun } from './startup'

/** The first look for a new version waits a little, so it does not slow down the start. */
const FIRST_CHECK_DELAY_MS = 15_000

/**
 * New versions of the PC app, from the GitHub Releases of the project (`publish` in
 * electron-builder.yml). They download in the background and install when the app restarts:
 * with the button in the app, or the next time the app quits.
 *
 * Only the installed app looks for them, never in development or in a test run. Development
 * tests can point it at a local server that serves a latest.yml:
 * MI_ESTUDIO_UPDATES_URL=http://127.0.0.1:8090 (the installed app ignores it).
 */
export class Updater {
  private current: UpdateStatus

  constructor(private readonly onStatus: (status: UpdateStatus) => void) {
    const testServer = !app.isPackaged && process.env['MI_ESTUDIO_UPDATES_URL']
    const enabled = (app.isPackaged && !isTestRun()) || Boolean(testServer)
    this.current = enabled ? { state: 'idle' } : { state: 'disabled' }
    if (!enabled) return

    if (testServer) {
      // Outside the installed app, electron-updater reads its settings from this file
      const config = join(app.getPath('temp'), 'keystone-dev-app-update.yml')
      writeFileSync(
        config,
        `provider: generic\nurl: ${testServer}\nupdaterCacheDirName: keystone-updater-test\n`
      )
      autoUpdater.updateConfigPath = config
      autoUpdater.forceDevUpdateConfig = true
    }
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking' }))
    autoUpdater.on('update-not-available', () =>
      this.set({ state: 'upToDate', checkedAt: Date.now() })
    )
    autoUpdater.on('update-available', ({ version }) =>
      this.set({ state: 'downloading', version, percent: 0 })
    )
    autoUpdater.on('download-progress', ({ percent }) => {
      const rounded = Math.floor(percent)
      // Many events per second: only a new whole number reaches the screen
      if (this.current.state === 'downloading' && this.current.percent !== rounded) {
        this.set({ ...this.current, percent: rounded })
      }
    })
    autoUpdater.on('update-downloaded', ({ version }) => this.set({ state: 'ready', version }))
    autoUpdater.on('error', () => this.set({ state: 'error', checkedAt: Date.now() }))
  }

  status(): UpdateStatus {
    return this.current
  }

  start(): void {
    if (this.current.state === 'disabled') return
    setTimeout(() => this.check(), FIRST_CHECK_DELAY_MS)
    setInterval(() => this.check(), UPDATE_CHECK_INTERVAL_MS)
  }

  /** Looks for a new version, unless one is already on its way or waiting to install. */
  check(): UpdateStatus {
    const { state } = this.current
    if (state === 'idle' || state === 'upToDate' || state === 'error') {
      // Right away, so the button that asked for it already shows the new state
      this.set({ state: 'checking' })
      // The 'error' event already says when it fails
      autoUpdater.checkForUpdates().catch(() => {})
    }
    return this.current
  }

  /** Closes the app, installs the downloaded version and opens the app again. */
  install(): void {
    if (this.current.state === 'ready') autoUpdater.quitAndInstall(true, true)
  }

  private set(status: UpdateStatus): void {
    this.current = status
    this.onStatus(status)
  }
}
