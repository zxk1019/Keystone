/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Phone test builds only: the computer running the Firebase emulator (see vite.mobile.config.ts) */
  readonly VITE_FIREBASE_EMULATOR?: string
  /** Phone test builds only: a local server that answers like the GitHub API for the latest release */
  readonly VITE_UPDATES_API?: string
}

/** The version in package.json, written into the phone build (vite.mobile.config.ts) */
declare const __APP_VERSION__: string
