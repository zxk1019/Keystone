import { isRecord } from '@shared/validation'
import { readSecureJson, removeSecureFile, writeSecureJson } from '../secureFile'

/** What is remembered between runs once signed in. The password is never saved. */
export interface SavedSyncSession {
  /** The Firebase project the account belongs to: a different one needs a new sign-in */
  projectId: string
  uid: string
  email: string
  refreshToken: string
}

/** Keeps the sync session encrypted in its own file (see secureFile.ts). */
export class SyncSessionStore {
  constructor(private readonly filePath: string) {}

  load(): SavedSyncSession | null {
    const value = readSecureJson(this.filePath)
    if (!isRecord(value)) return null
    const { projectId, uid, email, refreshToken } = value
    if (
      typeof projectId !== 'string' ||
      typeof uid !== 'string' ||
      typeof refreshToken !== 'string'
    ) {
      return null
    }
    return { projectId, uid, refreshToken, email: typeof email === 'string' ? email : '' }
  }

  save(session: SavedSyncSession): void {
    writeSecureJson(this.filePath, session)
  }

  clear(): void {
    removeSecureFile(this.filePath)
  }
}
