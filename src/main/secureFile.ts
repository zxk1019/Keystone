import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { dirname } from 'path'

/*
 * Small JSON files encrypted with the operating system (DPAPI on Windows), for sessions such as
 * Spotify's or the sync's. They live outside the backups. Without encryption available, nothing
 * is written to disk and the user has to sign in again on the next run.
 */

/** The saved value, or null if there is none or it cannot be read (e.g. copied from another PC). */
export function readSecureJson(filePath: string): unknown {
  if (!existsSync(filePath) || !safeStorage.isEncryptionAvailable()) return null
  try {
    return JSON.parse(safeStorage.decryptString(readFileSync(filePath)))
  } catch {
    return null
  }
}

export function writeSecureJson(filePath: string, value: unknown): void {
  if (!safeStorage.isEncryptionAvailable()) return
  mkdirSync(dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp`
  writeFileSync(tempPath, safeStorage.encryptString(JSON.stringify(value)))
  renameSync(tempPath, filePath)
}

export function removeSecureFile(filePath: string): void {
  rmSync(filePath, { force: true })
}
