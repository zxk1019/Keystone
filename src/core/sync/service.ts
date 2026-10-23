import {
  MAX_WRITES_PER_COMMIT,
  commitRecords,
  downloadRecords,
  refreshSession,
  sendPasswordReset,
  signInWithPassword,
  type FirebaseUrls,
  type FirestoreTarget,
  type SyncError,
  type SyncResult
} from '@shared/firebase'
import {
  applyRemote,
  forAccount,
  markPushed,
  pendingRecords,
  withCursor,
  type SyncStatus
} from '@shared/sync'
import type { SyncSettings } from '@shared/types'
import { isRecord } from '@shared/validation'
import type { DataStore } from '../data/dataStore'

/** What is remembered between runs once signed in. The password is never saved. */
export interface SavedSyncSession {
  /** The Firebase project the account belongs to: a different one needs a new sign-in */
  projectId: string
  uid: string
  email: string
  refreshToken: string
}

/** Where the session is kept on each device (encrypted on the PC, app storage on the phone). */
export interface SyncSessionStore {
  save(session: SavedSyncSession): void
  clear(): void
}

/** A saved session read back from storage; null if it is not one. */
export function parseSavedSession(value: unknown): SavedSyncSession | null {
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

interface SyncDeps {
  store: DataStore
  config: () => SyncSettings
  /** The session saved on a previous run, if any */
  savedSession: SavedSyncSession | null
  sessions: SyncSessionStore
  /** The real Firebase, or the local emulator in development tests */
  urls: FirebaseUrls
  onStatus: (status: SyncStatus) => void
  /** Something downloaded from another device changed the agenda or the shared settings */
  onRemoteChange: (change: { agenda: boolean; settings: boolean }) => void
}

/** Catch up with the other devices every few minutes, even without changes here */
const PERIODIC_SYNC_MS = 5 * 60_000
/** Wait a little after a change, so a few quick edits go up together */
const AFTER_CHANGE_MS = 3_000
/** Without connection, try again after a minute */
const RETRY_MS = 60_000
/** Bringing the window to the front syncs, but not more often than this */
const FOCUS_GAP_MS = 30_000
/** Renew the ID token a minute before it expires */
const EXPIRY_MARGIN_MS = 60_000

const OK: SyncResult<null> = { ok: true, value: null }

/**
 * Keeps this device in sync with the user's Firebase project: downloads what the other devices
 * changed, then uploads what changed here. The tokens never leave the main process.
 */
export class SyncService {
  private session: SavedSyncSession | null
  private access: { token: string; expiresAt: number } | null = null
  private running: Promise<void> | null = null
  /** Something changed while a sync was running: another one follows */
  private again = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastSyncAt: number | null = null
  private error: SyncError | null = null
  private expired = false

  constructor(private readonly deps: SyncDeps) {
    const saved = deps.savedSession
    this.session = saved && saved.projectId === deps.config().projectId ? saved : null
  }

  start(): void {
    this.deps.store.onLocalChange(() => {
      this.emit()
      this.schedule(AFTER_CHANGE_MS)
    })
    setInterval(() => this.schedule(0), PERIODIC_SYNC_MS)
    this.schedule(0)
  }

  status(): SyncStatus {
    const { apiKey, projectId } = this.deps.config()
    if (!apiKey || !projectId) return { state: 'notConfigured' }
    if (!this.session) return { state: 'signedOut', expired: this.expired }
    return {
      state: 'signedIn',
      email: this.session.email,
      syncing: this.running !== null,
      lastSyncAt: this.lastSyncAt,
      pending: this.deps.store.get().sync.pending.length,
      error: this.error
    }
  }

  /** Creates the account (signUp) or signs in to it, then syncs straight away. */
  async signIn(
    mode: 'signIn' | 'signUp',
    email: string,
    password: string
  ): Promise<SyncResult<SyncStatus>> {
    const { apiKey, projectId } = this.deps.config()
    if (!apiKey || !projectId) return { ok: false, error: 'badConfig' }

    const result = await signInWithPassword(this.deps.urls, apiKey, mode, email, password)
    if (!result.ok) return result
    const { uid, idToken, refreshToken, expiresAt } = result.value
    this.session = { projectId, uid, email: result.value.email, refreshToken }
    this.access = { token: idToken, expiresAt }
    this.deps.sessions.save(this.session)
    this.error = null
    this.expired = false
    void this.sync()
    return { ok: true, value: this.status() }
  }

  /** The data stays on this device; signing in again to the same account continues from it. */
  signOut(): void {
    this.session = null
    this.access = null
    this.error = null
    this.lastSyncAt = null
    this.expired = false
    this.deps.sessions.clear()
    this.emit()
  }

  resetPassword(email: string): Promise<SyncResult<null>> {
    const { apiKey } = this.deps.config()
    if (!apiKey) return Promise.resolve({ ok: false, error: 'badConfig' })
    return sendPasswordReset(this.deps.urls, apiKey, email)
  }

  async syncNow(): Promise<SyncStatus> {
    await this.sync()
    return this.status()
  }

  /** A different Firebase project has other accounts, so the session no longer applies. */
  configChanged(): void {
    if (this.session && this.session.projectId !== this.deps.config().projectId) this.signOut()
    else this.emit()
  }

  /** The window came to the front: the user may have just changed something on the phone. */
  windowFocused(): void {
    if (this.lastSyncAt === null || Date.now() - this.lastSyncAt > FOCUS_GAP_MS) this.schedule(0)
  }

  private schedule(delay: number): void {
    if (!this.session) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.sync()
    }, delay)
  }

  /** Only one sync at a time; asking during one runs another right after it. */
  private sync(): Promise<void> {
    if (!this.session) return Promise.resolve()
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = this.run().finally(() => {
      this.running = null
      this.emit()
      if (this.again) {
        this.again = false
        this.schedule(0)
      }
    })
    this.emit()
    return this.running
  }

  private async run(): Promise<void> {
    let result = await this.syncOnce(false)
    // The ID token may have been revoked or expired early: renew it once and try again
    if (!result.ok && result.error === 'sessionExpired' && this.session) {
      result = await this.syncOnce(true)
    }
    if (result.ok) {
      this.error = null
      this.lastSyncAt = Date.now()
      return
    }
    if (result.error === 'sessionExpired') {
      this.signOut()
      this.expired = true
      return
    }
    this.error = result.error
    this.schedule(RETRY_MS)
  }

  private async syncOnce(renewToken: boolean): Promise<SyncResult<null>> {
    const target = await this.target(renewToken)
    if (!target.ok) return target
    const { store } = this.deps

    // The first sync with an account (or with a different one) uploads everything on this device
    const current = store.get()
    const sync = forAccount(current, target.value.uid, Date.now())
    if (sync !== current.sync) store.replaceFromSync({ ...current, sync })

    const pulled = await this.pull(target.value)
    if (!pulled.ok) return pulled
    const pushed = await this.push(target.value)
    if (pushed.ok || pushed.error !== 'permissionDenied') return pushed

    // The rules refuse an older version: another device changed the same record meanwhile.
    // Downloading it drops the older change here, and the rest can go up.
    const again = await this.pull(target.value)
    return again.ok ? this.push(target.value) : again
  }

  /** Applies what the other devices changed since the last download. */
  private async pull(target: FirestoreTarget): Promise<SyncResult<null>> {
    const since = this.deps.store.get().sync.account?.cursor ?? ''
    const downloaded = await downloadRecords(target, since)
    if (!downloaded.ok) return downloaded

    // Merged into the current data: something may have changed here during the download
    const current = this.deps.store.get()
    const merged = applyRemote(current, downloaded.value.records, Date.now())
    const { cursor } = downloaded.value
    const newer = cursor !== null && (since === '' || Date.parse(cursor) > Date.parse(since))
    const data = newer
      ? { ...merged.data, sync: withCursor(merged.data.sync, cursor) }
      : merged.data
    if (data !== current) this.deps.store.replaceFromSync(data)
    if (merged.agendaChanged || merged.settingsChanged) {
      this.deps.onRemoteChange({ agenda: merged.agendaChanged, settings: merged.settingsChanged })
    }
    return OK
  }

  /** Uploads the changes made here, in batches. */
  private async push(target: FirestoreTarget): Promise<SyncResult<null>> {
    const records = pendingRecords(this.deps.store.get())
    for (let start = 0; start < records.length; start += MAX_WRITES_PER_COMMIT) {
      const batch = records.slice(start, start + MAX_WRITES_PER_COMMIT)
      const result = await commitRecords(target, batch)
      if (!result.ok) return result
      const current = this.deps.store.get()
      this.deps.store.replaceFromSync({ ...current, sync: markPushed(current.sync, batch) })
    }
    return OK
  }

  /** Where to read and write, with an ID token that is still valid. */
  private async target(renew: boolean): Promise<SyncResult<FirestoreTarget>> {
    const session = this.session
    if (!session) return { ok: false, error: 'sessionExpired' }
    if (renew || !this.access || this.access.expiresAt - EXPIRY_MARGIN_MS < Date.now()) {
      const renewed = await refreshSession(
        this.deps.urls,
        this.deps.config().apiKey,
        session.refreshToken
      )
      if (!renewed.ok) return renewed
      this.access = { token: renewed.value.idToken, expiresAt: renewed.value.expiresAt }
      if (renewed.value.refreshToken !== session.refreshToken && this.session === session) {
        this.session = { ...session, refreshToken: renewed.value.refreshToken }
        this.deps.sessions.save(this.session)
      }
    }
    return {
      ok: true,
      value: {
        urls: this.deps.urls,
        projectId: session.projectId,
        uid: session.uid,
        idToken: this.access.token
      }
    }
  }

  private emit(): void {
    this.deps.onStatus(this.status())
  }
}
