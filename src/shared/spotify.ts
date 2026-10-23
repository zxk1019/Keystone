// What the app knows about Spotify, plus pure helpers to read the Web API answers.
// The calls themselves are made by the main process (src/main/spotify/).
import { isRecord } from './validation'

export interface SpotifyTrack {
  title: string
  artists: string
  album: string
  imageUrl: string | null
}

export interface SpotifyDevice {
  id: string
  name: string
  /** "Computer", "Smartphone", "Speaker"... */
  type: string
  isActive: boolean
  volumePercent: number | null
  supportsVolume: boolean
}

export interface SpotifyPlayback {
  isPlaying: boolean
  track: SpotifyTrack | null
  device: SpotifyDevice | null
  /** The playlist or album being played */
  contextUri: string | null
}

export interface SpotifyPlaylist {
  uri: string
  name: string
  imageUrl: string | null
}

export type SpotifyStatus =
  | { state: 'notConfigured' }
  | { state: 'disconnected' }
  | { state: 'connected'; userName: string; premium: boolean }

export type SpotifyError =
  | 'notConfigured'
  | 'sessionExpired'
  | 'premiumRequired'
  | 'noDevice'
  | 'notRegistered'
  | 'rateLimited'
  | 'network'
  | 'portInUse'
  | 'loginCanceled'
  | 'loginTimeout'
  | 'unknown'

export type SpotifyResult<T> = { ok: true; value: T } | { ok: false; error: SpotifyError }

export type SpotifyCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'volume'; percent: number }
  | { type: 'playPlaylist'; uri: string }
  | { type: 'transfer'; deviceId: string }
  | { type: 'openApp' }

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The smallest image that is still at least 64 px wide, for a small cover. */
function pickImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null
  const usable = images
    .filter(isRecord)
    .filter((image) => typeof image.url === 'string')
    .sort((a, b) => Number(a.width ?? 0) - Number(b.width ?? 0))
  const image = usable.find((candidate) => Number(candidate.width ?? 0) >= 64) ?? usable.at(-1)
  return image ? text(image.url) : null
}

export function parseDevice(value: unknown): SpotifyDevice | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    name: text(value.name),
    type: text(value.type),
    isActive: value.is_active === true,
    volumePercent: typeof value.volume_percent === 'number' ? value.volume_percent : null,
    supportsVolume: value.supports_volume === true
  }
}

export function parseDevices(value: unknown): SpotifyDevice[] {
  const devices = isRecord(value) && Array.isArray(value.devices) ? value.devices : []
  return devices.map(parseDevice).filter((device): device is SpotifyDevice => device !== null)
}

/** GET /me/player; an empty answer (nothing playing anywhere) is null. */
export function parsePlayback(value: unknown): SpotifyPlayback | null {
  if (!isRecord(value)) return null
  const item = isRecord(value.item) ? value.item : null
  const album = item && isRecord(item.album) ? item.album : null
  const artists = item && Array.isArray(item.artists) ? item.artists.filter(isRecord) : []
  return {
    isPlaying: value.is_playing === true,
    track: item
      ? {
          title: text(item.name),
          artists: artists.map((artist) => text(artist.name)).join(', '),
          album: text(album?.name),
          imageUrl: pickImage(album?.images)
        }
      : null,
    device: parseDevice(value.device),
    contextUri: isRecord(value.context) ? text(value.context.uri) || null : null
  }
}

export function parsePlaylists(value: unknown): SpotifyPlaylist[] {
  const items = isRecord(value) && Array.isArray(value.items) ? value.items : []
  return items
    .filter(isRecord)
    .filter((playlist) => typeof playlist.uri === 'string')
    .map((playlist) => ({
      uri: text(playlist.uri),
      name: text(playlist.name),
      imageUrl: pickImage(playlist.images)
    }))
}

/** Turns a failed Web API answer into one of the errors the screens know how to explain. */
export function errorFromResponse(status: number, body: unknown): SpotifyError {
  const error = isRecord(body) && isRecord(body.error) ? body.error : {}
  const reason = text(error.reason)
  const message = text(error.message).toLowerCase()
  if (status === 401) return 'sessionExpired'
  if (status === 429) return 'rateLimited'
  if (reason === 'PREMIUM_REQUIRED') return 'premiumRequired'
  if (reason === 'NO_ACTIVE_DEVICE') return 'noDevice'
  // Apps in development mode only accept the accounts added in the developer dashboard
  if (status === 403 && message.includes('not registered')) return 'notRegistered'
  if (status === 404 && message.includes('device')) return 'noDevice'
  return 'unknown'
}

/** What to do with the music when the study timer moves on. */
export function studyMusicAction(
  event: 'breakStarted' | 'blockStarted',
  {
    isPlaying,
    pausedByUs,
    hasStudyPlaylist,
    pauseOnBreak,
    playOnStudyStart
  }: {
    isPlaying: boolean
    pausedByUs: boolean
    hasStudyPlaylist: boolean
    pauseOnBreak: boolean
    playOnStudyStart: boolean
  }
): 'pause' | 'resume' | 'playStudyPlaylist' | 'nothing' {
  if (event === 'breakStarted') return pauseOnBreak && isPlaying ? 'pause' : 'nothing'
  if (isPlaying) return 'nothing'
  // Only music this app paused comes back by itself; music the user stopped stays stopped
  if (pausedByUs) return 'resume'
  return playOnStudyStart && hasStudyPlaylist ? 'playStudyPlaylist' : 'nothing'
}

const PLAYLIST_URI = /^spotify:playlist:[A-Za-z0-9]+$/

/** Checks a command coming from the screens before the main process acts on it. */
export function parseSpotifyCommand(value: unknown): SpotifyCommand | null {
  if (!isRecord(value)) return null
  switch (value.type) {
    case 'play':
    case 'pause':
    case 'next':
    case 'previous':
    case 'openApp':
      return { type: value.type }
    case 'volume':
      return typeof value.percent === 'number' && value.percent >= 0 && value.percent <= 100
        ? { type: 'volume', percent: value.percent }
        : null
    case 'playPlaylist':
      return typeof value.uri === 'string' && PLAYLIST_URI.test(value.uri)
        ? { type: 'playPlaylist', uri: value.uri }
        : null
    case 'transfer':
      return typeof value.deviceId === 'string' && value.deviceId.length > 0
        ? { type: 'transfer', deviceId: value.deviceId }
        : null
    default:
      return null
  }
}

/**
 * A study playlist from a link copied in Spotify ("Share → Copy link"), as Spotify writes it
 * in the app: "spotify:playlist:<id>". Null if the text is not a playlist.
 */
export function playlistUriFromLink(text: string): string | null {
  const value = text.trim()
  const uri = /^spotify:playlist:([A-Za-z0-9]+)$/.exec(value)
  if (uri) return value
  try {
    const url = new URL(value)
    if (url.hostname !== 'open.spotify.com') return null
    // Links may carry a language first: /intl-es/playlist/<id>
    const match = /^(?:\/intl-[a-z-]+)?\/playlist\/([A-Za-z0-9]+)\/?$/i.exec(url.pathname)
    return match ? `spotify:playlist:${match[1]}` : null
  } catch {
    return null
  }
}
