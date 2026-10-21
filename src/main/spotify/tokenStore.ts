import { isRecord } from '@shared/validation'
import { readSecureJson, removeSecureFile, writeSecureJson } from '../secureFile'

/** What is remembered between runs once Spotify is connected */
export interface SavedSession {
  /** The Client ID the session belongs to: a different one needs a new login */
  clientId: string
  refreshToken: string
  userName: string
  premium: boolean
}

/** Keeps the Spotify session encrypted in its own file (see secureFile.ts). */
export class TokenStore {
  constructor(private readonly filePath: string) {}

  load(): SavedSession | null {
    const value = readSecureJson(this.filePath)
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
  }

  save(session: SavedSession): void {
    writeSecureJson(this.filePath, session)
  }

  clear(): void {
    removeSecureFile(this.filePath)
  }
}
