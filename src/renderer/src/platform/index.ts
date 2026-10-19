import type { DesktopApi } from '@shared/api'

/**
 * Everything the UI needs from the device. The UI only talks to `platform`, never to Electron.
 * Today it is the Electron preload bridge (`window.api`); the mobile version will provide
 * its own implementation with Capacitor.
 */
export type Platform = DesktopApi

export const platform: Platform = window.api
