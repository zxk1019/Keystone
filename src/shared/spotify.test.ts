import { describe, expect, it } from 'vitest'
import {
  errorFromResponse,
  parseDevices,
  parsePlayback,
  parsePlaylists,
  parseSpotifyCommand,
  playlistUriFromLink,
  studyMusicAction
} from './spotify'

describe('parsePlayback', () => {
  it('reads the song, the device and the playlist', () => {
    const playback = parsePlayback({
      is_playing: true,
      context: { uri: 'spotify:playlist:abc' },
      device: {
        id: 'd1',
        name: 'PORTATIL',
        type: 'Computer',
        is_active: true,
        volume_percent: 60,
        supports_volume: true
      },
      item: {
        name: 'Snowman',
        artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
        album: {
          name: 'Winter',
          images: [
            { url: 'big', width: 640 },
            { url: 'small', width: 64 },
            { url: 'medium', width: 300 }
          ]
        }
      }
    })
    expect(playback).toEqual({
      isPlaying: true,
      contextUri: 'spotify:playlist:abc',
      device: {
        id: 'd1',
        name: 'PORTATIL',
        type: 'Computer',
        isActive: true,
        volumePercent: 60,
        supportsVolume: true
      },
      track: { title: 'Snowman', artists: 'Artist A, Artist B', album: 'Winter', imageUrl: 'small' }
    })
  })

  it('returns null when nothing is playing anywhere', () => {
    expect(parsePlayback(null)).toBeNull()
  })
})

describe('lists', () => {
  it('reads devices and playlists, skipping broken entries', () => {
    expect(parseDevices({ devices: [{ id: 'a', name: 'PC' }, { name: 'no id' }] })).toHaveLength(1)
    expect(
      parsePlaylists({ items: [{ uri: 'spotify:playlist:1', name: 'Lofi', images: null }, {}] })
    ).toEqual([{ uri: 'spotify:playlist:1', name: 'Lofi', imageUrl: null }])
  })
})

describe('errorFromResponse', () => {
  it('recognises the errors the app explains', () => {
    expect(errorFromResponse(401, {})).toBe('sessionExpired')
    expect(errorFromResponse(403, { error: { reason: 'PREMIUM_REQUIRED' } })).toBe(
      'premiumRequired'
    )
    expect(errorFromResponse(404, { error: { reason: 'NO_ACTIVE_DEVICE' } })).toBe('noDevice')
    expect(
      errorFromResponse(403, {
        error: { message: 'User not registered in the Developer Dashboard' }
      })
    ).toBe('notRegistered')
    expect(errorFromResponse(429, {})).toBe('rateLimited')
    expect(errorFromResponse(500, 'oops')).toBe('unknown')
  })
})

describe('studyMusicAction', () => {
  const base = {
    isPlaying: false,
    pausedByUs: false,
    hasStudyPlaylist: true,
    pauseOnBreak: true,
    playOnStudyStart: true
  }

  it('pauses the music when a break starts, if it is playing and the option is on', () => {
    expect(studyMusicAction('breakStarted', { ...base, isPlaying: true })).toBe('pause')
    expect(studyMusicAction('breakStarted', base)).toBe('nothing')
    expect(
      studyMusicAction('breakStarted', { ...base, isPlaying: true, pauseOnBreak: false })
    ).toBe('nothing')
  })

  it('resumes only music it paused itself', () => {
    expect(studyMusicAction('blockStarted', { ...base, pausedByUs: true })).toBe('resume')
  })

  it('starts the study playlist when nothing is playing', () => {
    expect(studyMusicAction('blockStarted', base)).toBe('playStudyPlaylist')
    expect(studyMusicAction('blockStarted', { ...base, playOnStudyStart: false })).toBe('nothing')
    expect(studyMusicAction('blockStarted', { ...base, hasStudyPlaylist: false })).toBe('nothing')
    expect(studyMusicAction('blockStarted', { ...base, isPlaying: true })).toBe('nothing')
  })
})

describe('parseSpotifyCommand', () => {
  it('accepts valid commands and rejects anything else', () => {
    expect(parseSpotifyCommand({ type: 'next' })).toEqual({ type: 'next' })
    expect(parseSpotifyCommand({ type: 'volume', percent: 40 })).toEqual({
      type: 'volume',
      percent: 40
    })
    expect(parseSpotifyCommand({ type: 'volume', percent: 140 })).toBeNull()
    expect(
      parseSpotifyCommand({ type: 'playPlaylist', uri: 'spotify:playlist:37i9dQZF1DX8U' })
    ).not.toBeNull()
    expect(parseSpotifyCommand({ type: 'playPlaylist', uri: 'https://evil.example' })).toBeNull()
    expect(parseSpotifyCommand({ type: 'deleteEverything' })).toBeNull()
  })
})

describe('playlistUriFromLink', () => {
  it('reads the links Spotify copies, with or without language and tracking', () => {
    expect(
      playlistUriFromLink('https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6?si=abc')
    ).toBe('spotify:playlist:37i9dQZF1DX8NTLI2TtZa6')
    expect(
      playlistUriFromLink(' https://open.spotify.com/intl-es/playlist/37i9dQZF1DX8NTLI2TtZa6 ')
    ).toBe('spotify:playlist:37i9dQZF1DX8NTLI2TtZa6')
    expect(playlistUriFromLink('spotify:playlist:37i9dQZF1DX8NTLI2TtZa6')).toBe(
      'spotify:playlist:37i9dQZF1DX8NTLI2TtZa6'
    )
  })

  it('rejects anything that is not a playlist', () => {
    expect(playlistUriFromLink('https://open.spotify.com/album/1A2B3C')).toBeNull()
    expect(playlistUriFromLink('https://example.com/playlist/1A2B3C')).toBeNull()
    expect(playlistUriFromLink('mi playlist')).toBeNull()
  })
})
