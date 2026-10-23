import type { Platform } from '.'

/** The PC app: the main process does the work, reached through the preload bridge. */
export const platform: Platform = {
  ...window.api,
  capabilities: { eyeBreak: true, startWithWindows: true, spotifyControl: true },
  // Computers have no back button
  onBackButton: () => () => {}
}
