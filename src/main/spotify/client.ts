import {
  errorFromResponse,
  parseDevices,
  parsePlayback,
  parsePlaylists,
  type SpotifyCommand,
  type SpotifyDevice,
  type SpotifyPlayback,
  type SpotifyPlaylist,
  type SpotifyResult
} from '@shared/spotify'
import { isRecord } from '@shared/validation'

type AccessToken = (forceRefresh: boolean) => Promise<SpotifyResult<string>>

/** Thin wrapper over the Spotify Web API calls the app needs. */
export class SpotifyClient {
  constructor(
    private readonly apiBase: string,
    private readonly accessToken: AccessToken
  ) {}

  /** Retries once with a fresh token if Spotify says the current one expired. */
  private async request(
    method: 'GET' | 'PUT' | 'POST',
    path: string,
    body?: unknown
  ): Promise<SpotifyResult<unknown>> {
    for (const forceRefresh of [false, true]) {
      const token = await this.accessToken(forceRefresh)
      if (!token.ok) return token

      let response: Response
      try {
        response = await fetch(`${this.apiBase}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${token.value}`,
            ...(body ? { 'Content-Type': 'application/json' } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch {
        return { ok: false, error: 'network' }
      }

      if (response.status === 401 && !forceRefresh) continue
      const text = await response.text()
      let json: unknown = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        // Some player calls answer with a plain-text body; it carries nothing the app needs
      }
      if (!response.ok) return { ok: false, error: errorFromResponse(response.status, json) }
      return { ok: true, value: json }
    }
    return { ok: false, error: 'sessionExpired' }
  }

  private async read<T>(path: string, parse: (json: unknown) => T): Promise<SpotifyResult<T>> {
    const result = await this.request('GET', path)
    return result.ok ? { ok: true, value: parse(result.value) } : result
  }

  me(): Promise<SpotifyResult<{ userName: string; premium: boolean }>> {
    return this.read('/me', (json) => ({
      userName: isRecord(json) && typeof json.display_name === 'string' ? json.display_name : '',
      premium: isRecord(json) && json.product === 'premium'
    }))
  }

  playback(): Promise<SpotifyResult<SpotifyPlayback | null>> {
    return this.read('/me/player', parsePlayback)
  }

  devices(): Promise<SpotifyResult<SpotifyDevice[]>> {
    return this.read('/me/player/devices', parseDevices)
  }

  playlists(): Promise<SpotifyResult<SpotifyPlaylist[]>> {
    return this.read('/me/playlists?limit=50', parsePlaylists)
  }

  async command(
    command: Exclude<SpotifyCommand, { type: 'openApp' }>
  ): Promise<SpotifyResult<null>> {
    const done = (result: SpotifyResult<unknown>): SpotifyResult<null> =>
      result.ok ? { ok: true, value: null } : result
    switch (command.type) {
      case 'play':
        return done(await this.request('PUT', '/me/player/play'))
      case 'pause':
        return done(await this.request('PUT', '/me/player/pause'))
      case 'next':
        return done(await this.request('POST', '/me/player/next'))
      case 'previous':
        return done(await this.request('POST', '/me/player/previous'))
      case 'volume':
        return done(
          await this.request(
            'PUT',
            `/me/player/volume?volume_percent=${Math.round(command.percent)}`
          )
        )
      case 'playPlaylist':
        return done(await this.request('PUT', '/me/player/play', { context_uri: command.uri }))
      case 'transfer':
        return done(
          await this.request('PUT', '/me/player', { device_ids: [command.deviceId], play: true })
        )
    }
  }
}
