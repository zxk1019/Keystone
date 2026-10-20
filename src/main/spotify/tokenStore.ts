import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { isRecord } from '@shared/validation'

/** What is remembered between runs once Spotify is connected */
export interface SavedSession {
  /** The Client ID the session belongs to: a different one needs a new login */
  clientId: string
  refreshToken: string
  userName: string
  premium: boolean
}

/**
 * Keeps the Spotify session encrypted with the operating system (DPAPI on Windows), in its
 * own file outside the backups. Without encryption available, nothing is written to disk
 * and Spotify has to be connected again on the next run.
 */
export class TokenStore {
  constructor(private readonly filePath: string) {}

  load(): SavedSession | null {
    if (!existsSync(this.filePath) || !safeStorage.isEncryptionAvailable()) return null
    try {
      const value: unknown = JSON.parse(safeStorage.decryptString(readFileSync(this.filePath)))
      if (
        !isRecord(value) ||
        typeof value.clientId !== 'string' ||
        typeof value.refreshToken !== 'string'
      ) {
        return null
      }
      return {
        clientId: value.clientId,
        refreshToken: value.refreshToken,
        userName: typeof value.userName === 'string' ? value.userName : '',
        premium: value.premium === true
      }
    } catch {
      // Unreadable (e.g. copied from another computer): Spotify just has to be connected again
      return null
    }
  }

  save(session: SavedSession): void {
    if (!safeStorage.isEncryptionAvailable()) return
    mkdirSync(dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.tmp`
    writeFileSync(tempPath, safeStorage.encryptString(JSON.stringify(session)))
    renameSync(tempPath, this.filePath)
  }

  clear(): void {
    rmSync(this.filePath, { force: true })
  }
}
