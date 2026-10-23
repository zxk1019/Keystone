import { shell } from 'electron'
import {
  studyMusicAction,
  type SpotifyCommand,
  type SpotifyDevice,
  type SpotifyPlayback,
  type SpotifyPlaylist,
  type SpotifyResult,
  type SpotifyStatus
} from '@shared/spotify'
import type { SpotifySettings } from '@shared/types'
import type { Translate } from '@core/i18n'
import { exchangeCode, refreshTokens, waitForCode } from './auth'
import { SpotifyClient } from './client'
import { authorizeUrl, challengeFor, createState, createVerifier } from './pkce'
import type { SavedSession, TokenStore } from './tokenStore'

interface SpotifyDeps {
  settings: () => SpotifySettings
  store: TokenStore
  /** Real Spotify, or a fake one in development tests */
  urls: { accounts: string; api: string }
  translate: () => Translate
  onStatus: (status: SpotifyStatus) => void
}

/** Renew the access token a minute before it expires */
const EXPIRY_MARGIN_MS = 60_000

/** Connects to the user's Spotify and controls it; the tokens never leave the main process. */
export class SpotifyService {
  private session: SavedSession | null
  private access: { token: string; expiresAt: number } | null = null
  /** The music was paused by the study break, so it may come back by itself */
  private pausedByUs = false
  private readonly client: SpotifyClient

  constructor(private readonly deps: SpotifyDeps) {
    const saved = deps.store.load()
    this.session = saved && saved.clientId === deps.settings().clientId ? saved : null
    this.client = new SpotifyClient(deps.urls.api, (force) => this.accessToken(force))
  }

  status(): SpotifyStatus {
    if (!this.deps.settings().clientId) return { state: 'notConfigured' }
    if (!this.session) return { state: 'disconnected' }
    return { state: 'connected', userName: this.session.userName, premium: this.session.premium }
  }

  async connect(): Promise<SpotifyResult<SpotifyStatus>> {
    const { clientId } = this.deps.settings()
    if (!clientId) return { ok: false, error: 'notConfigured' }

    const verifier = createVerifier()
    const state = createState()
    const t = this.deps.translate()
    const code = await waitForCode(
      state,
      () =>
        shell.openExternal(
          authorizeUrl(this.deps.urls.accounts, clientId, challengeFor(verifier), state)
        ),
      { done: t('spotify.browserDone'), failed: t('spotify.browserError') }
    )
    if (!code.ok) return code

    const tokens = await exchangeCode(this.deps.urls.accounts, clientId, code.value, verifier)
    if (!tokens.ok) return tokens
    if (!tokens.value.refreshToken) return { ok: false, error: 'unknown' }

    this.access = { token: tokens.value.accessToken, expiresAt: tokens.value.expiresAt }
    this.session = {
      clientId,
      refreshToken: tokens.value.refreshToken,
      userName: '',
      premium: false
    }
    const me = await this.client.me()
    if (me.ok) this.session = { ...this.session, ...me.value }
    this.deps.store.save(this.session)
    this.emit()
    return { ok: true, value: this.status() }
  }

  disconnect(): void {
    this.session = null
    this.access = null
    this.pausedByUs = false
    this.deps.store.clear()
    this.emit()
  }

  /** A new Client ID belongs to a different app, so the old session no longer works. */
  settingsChanged(): void {
    if (this.session && this.session.clientId !== this.deps.settings().clientId) this.disconnect()
    else this.emit()
  }

  playback(): Promise<SpotifyResult<SpotifyPlayback | null>> {
    return this.client.playback()
  }

  devices(): Promise<SpotifyResult<SpotifyDevice[]>> {
    return this.client.devices()
  }

  playlists(): Promise<SpotifyResult<SpotifyPlaylist[]>> {
    return this.client.playlists()
  }

  async command(command: SpotifyCommand): Promise<SpotifyResult<null>> {
    if (command.type === 'openApp') {
      // Opens the Spotify desktop app (or the Microsoft Store page if it is not installed)
      await shell.openExternal('spotify:')
      return { ok: true, value: null }
    }
    // Whatever the user does by hand wins over the automatic resume
    this.pausedByUs = false
    return this.client.command(command)
  }

  /** Pauses the music at the start of a break and brings it back with the next study block. */
  async onStudyEvent(event: 'breakStarted' | 'blockStarted'): Promise<void> {
    if (!this.session) return
    const settings = this.deps.settings()
    const playback = await this.client.playback()
    const action = studyMusicAction(event, {
      isPlaying: playback.ok && playback.value?.isPlaying === true,
      pausedByUs: this.pausedByUs,
      hasStudyPlaylist: settings.studyPlaylistUri !== '',
      pauseOnBreak: settings.pauseOnBreak,
      playOnStudyStart: settings.playOnStudyStart
    })
    // Errors are ignored here: there is no screen to show them on, and the Study panel
    // shows the real state on its next refresh
    if (action === 'pause') {
      const result = await this.client.command({ type: 'pause' })
      this.pausedByUs = result.ok
    } else if (action === 'resume') {
      await this.client.command({ type: 'play' })
    } else if (action === 'playStudyPlaylist') {
      await this.client.command({ type: 'playPlaylist', uri: settings.studyPlaylistUri })
    }
    if (event === 'blockStarted') this.pausedByUs = false
  }

  private async accessToken(forceRefresh: boolean): Promise<SpotifyResult<string>> {
    if (!this.session) {
      return {
        ok: false,
        error: this.deps.settings().clientId ? 'sessionExpired' : 'notConfigured'
      }
    }
    if (!forceRefresh && this.access && this.access.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
      return { ok: true, value: this.access.token }
    }

    const tokens = await refreshTokens(
      this.deps.urls.accounts,
      this.session.clientId,
      this.session.refreshToken
    )
    if (!tokens.ok) {
      if (tokens.error === 'sessionExpired') this.disconnect()
      return tokens
    }
    this.access = { token: tokens.value.accessToken, expiresAt: tokens.value.expiresAt }
    if (tokens.value.refreshToken && tokens.value.refreshToken !== this.session.refreshToken) {
      this.session = { ...this.session, refreshToken: tokens.value.refreshToken }
      this.deps.store.save(this.session)
    }
    return { ok: true, value: tokens.value.accessToken }
  }

  private emit(): void {
    this.deps.onStatus(this.status())
  }
}
