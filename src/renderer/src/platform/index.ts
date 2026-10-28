import type { DesktopApi } from '@shared/api'
import type { StudyMode } from '@shared/types'

/** What this device can do. The screens hide what it cannot. */
export interface PlatformCapabilities {
  /** The 20-20-20 rule is for the computer */
  eyeBreak: boolean
  startWithWindows: boolean
  /** Spotify controlled through its Web API; without it the app can only open Spotify */
  spotifyControl: boolean
  /** The app installs new versions itself; without it, it only offers the download */
  installsUpdates: boolean
}

/**
 * Everything the UI needs from the device. The UI only talks to `platform`, never to Electron
 * or Capacitor. The build picks the implementation through the `@platform` alias:
 * `desktop.ts` (the Electron preload bridge) or `mobile/` (the phone app).
 */
export type Platform = DesktopApi & {
  capabilities: PlatformCapabilities
  /** The study timer mode until the user picks one on this device */
  defaultStudyMode: StudyMode
  /** Android's back button. The callback returns true when it used it (e.g. closed a dialog). */
  onBackButton(callback: () => boolean): () => void
}

export { platform } from '@platform'
