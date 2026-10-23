import { parseSavedSession, type SavedSyncSession, type SyncSessionStore } from '@core/sync/service'
import { readSecureJson, removeSecureFile, writeSecureJson } from '../secureFile'

/** Keeps the sync session encrypted in its own file on the PC (see secureFile.ts). */
export class SecureSyncSessionStore implements SyncSessionStore {
  constructor(private readonly filePath: string) {}

  load(): SavedSyncSession | null {
    return parseSavedSession(readSecureJson(this.filePath))
  }

  save(session: SavedSyncSession): void {
    writeSecureJson(this.filePath, session)
  }

  clear(): void {
    removeSecureFile(this.filePath)
  }
}
