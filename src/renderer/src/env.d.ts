/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Phone test builds only: the computer running the Firebase emulator (see vite.mobile.config.ts) */
  readonly VITE_FIREBASE_EMULATOR?: string
}
