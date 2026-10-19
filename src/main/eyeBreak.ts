import { BrowserWindow, powerMonitor, screen, type Display } from 'electron'
import type { EyeBreakCommand } from '@shared/api'
import {
  createEyeBreak,
  deferEyeBreak,
  eyeBreakStatus,
  restartCount,
  tickEyeBreak,
  type EyeBreakState,
  type EyeBreakStatus
} from '@shared/eyeBreak'
import type { TimerState } from '@shared/studyTimer'
import type { EyeBreakSettings } from '@shared/types'
import { loadRenderer, PRELOAD_PATH } from './mainWindow'

const TICK_MS = 10_000
/** Longer gaps between ticks (the computer slept) do not count as use */
const MAX_TICK_MS = 30_000
/** The dark screens close by themselves this long after they should have, just in case */
const SAFETY_MARGIN_MS = 10_000

interface EyeBreakDeps {
  settings: () => EyeBreakSettings
  study: () => TimerState
  /** True during a full-screen game or a presentation */
  isBusy: () => Promise<boolean>
  onStatus: (status: EyeBreakStatus) => void
}

/** One dark, always-on-top window covering a whole monitor. */
function createOverlay(
  display: Display,
  primary: boolean,
  endsAt: number,
  durationMs: number
): BrowserWindow {
  const { x, y, width, height } = display.bounds
  const window = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    hasShadow: false,
    // Only the main monitor takes the keyboard focus (for Esc); the others are just dimmed
    focusable: primary,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  // Above everything, including full-screen windows and the taskbar
  window.setAlwaysOnTop(true, 'screen-saver')
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.once('ready-to-show', () => {
    if (primary) {
      window.show()
      window.focus()
    } else {
      window.showInactive()
    }
  })
  loadRenderer(
    window,
    `eye-break?primary=${primary ? 1 : 0}&endsAt=${endsAt}&duration=${durationMs}`
  )
  return window
}

/** The 20-20-20 rule: counts computer use and covers the screens when it is time to rest. */
export class EyeBreakService {
  private state: EyeBreakState = createEyeBreak()
  private lastTick = Date.now()
  private overlays: BrowserWindow[] = []
  private safetyTimeout: NodeJS.Timeout | undefined

  constructor(private readonly deps: EyeBreakDeps) {}

  start(): void {
    setInterval(() => this.tick(), TICK_MS)
    // A locked or sleeping computer means the eyes are resting
    powerMonitor.on('lock-screen', () => this.restart())
    powerMonitor.on('suspend', () => this.restart())
  }

  status(): EyeBreakStatus {
    return eyeBreakStatus(this.state, this.deps.settings(), Date.now())
  }

  /** Back to zero, e.g. when a study break starts. */
  restart(): void {
    this.update(restartCount(this.state))
  }

  command(command: EyeBreakCommand): EyeBreakStatus {
    const now = Date.now()
    switch (command) {
      case 'finish':
      case 'skip':
        this.closeOverlays()
        break
      case 'test':
        this.showOverlays()
        break
      case 'resume':
        this.update(restartCount({ ...this.state, pause: null }))
        break
      case 'pause30':
        this.update({ ...this.state, pause: { until: now + 30 * 60_000 } })
        break
      case 'pause60':
        this.update({ ...this.state, pause: { until: now + 60 * 60_000 } })
        break
      case 'pauseRestart':
        this.update({ ...this.state, pause: 'restart' })
        break
    }
    return this.status()
  }

  settingsChanged(): void {
    if (!this.deps.settings().enabled && this.state.showing) this.closeOverlays()
    else this.deps.onStatus(this.status())
  }

  private async tick(): Promise<void> {
    const now = Date.now()
    const elapsedMs = Math.min(now - this.lastTick, MAX_TICK_MS)
    this.lastTick = now

    const { state, show } = tickEyeBreak(this.state, {
      now,
      elapsedMs,
      idleSeconds: powerMonitor.getSystemIdleTime(),
      settings: this.deps.settings(),
      study: this.deps.study()
    })
    this.update(state)
    if (!show) return

    if (await this.deps.isBusy()) this.update(deferEyeBreak(this.state, Date.now()))
    else this.showOverlays()
  }

  private showOverlays(): void {
    if (this.state.showing) return
    const durationMs = this.deps.settings().durationSeconds * 1000
    const endsAt = Date.now() + durationMs
    const primaryId = screen.getPrimaryDisplay().id
    this.overlays = screen
      .getAllDisplays()
      .map((display) => createOverlay(display, display.id === primaryId, endsAt, durationMs))
    this.safetyTimeout = setTimeout(() => this.closeOverlays(), durationMs + SAFETY_MARGIN_MS)
    this.update({ ...this.state, showing: true })
  }

  private closeOverlays(): void {
    clearTimeout(this.safetyTimeout)
    for (const window of this.overlays) if (!window.isDestroyed()) window.destroy()
    this.overlays = []
    this.update(restartCount({ ...this.state, showing: false }))
  }

  private update(state: EyeBreakState): void {
    this.state = state
    this.deps.onStatus(this.status())
  }
}
