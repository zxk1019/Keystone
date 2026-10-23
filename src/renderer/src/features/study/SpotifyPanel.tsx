import { useCallback, useEffect, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ExternalLink,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Settings,
  SkipBack,
  SkipForward,
  Speaker,
  Volume2
} from 'lucide-react'
import type {
  SpotifyCommand,
  SpotifyDevice,
  SpotifyError,
  SpotifyPlayback,
  SpotifyPlaylist
} from '@shared/spotify'
import Button from '../../components/Button'
import { inputClass } from '../../components/styles'
import { platform } from '../../platform'
import { useNavigationStore } from '../../store/navigationStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useSpotifyStore } from '../../store/spotifyStore'

/** How often the panel asks Spotify what is playing, only while the Study screen is open */
const REFRESH_MS = 5000

/** Spotify on the Study screen: full control on the PC, a shortcut to Spotify on the phone. */
export default function SpotifyPanel(): JSX.Element | null {
  return platform.capabilities.spotifyControl ? <SpotifyControlPanel /> : <PhoneSpotifyPanel />
}

/** On the phone the app does not control Spotify: it opens it, on the study playlist if set. */
function PhoneSpotifyPanel(): JSX.Element {
  const { t } = useTranslation()
  const playlist = useSettingsStore((state) => state.settings?.spotify.studyPlaylistUri ?? '')

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="flex items-center gap-2 font-semibold">
        <Music2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        {t('spotify.title')}
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('spotify.phoneDescription')}</p>
      <div className="flex flex-wrap gap-3">
        {playlist && (
          <Button
            variant="primary"
            icon={Play}
            onClick={() => platform.spotifyCommand({ type: 'playPlaylist', uri: playlist })}
          >
            {t('spotify.playStudyPlaylist')}
          </Button>
        )}
        <Button icon={ExternalLink} onClick={() => platform.spotifyCommand({ type: 'openApp' })}>
          {t('spotify.openSpotify')}
        </Button>
      </div>
    </section>
  )
}

/** Controls the user's Spotify from the Study screen. */
function SpotifyControlPanel(): JSX.Element | null {
  const { t } = useTranslation()
  const status = useSpotifyStore((state) => state.status)
  const connecting = useSpotifyStore((state) => state.connecting)
  const connectError = useSpotifyStore((state) => state.error)
  const connect = useSpotifyStore((state) => state.connect)
  const goTo = useNavigationStore((state) => state.goTo)

  if (!status) return null

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="flex items-center gap-2 font-semibold">
        <Music2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        {t('spotify.title')}
      </h2>

      {status.state === 'notConfigured' && (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('spotify.notConfigured')}</p>
          <Button icon={Settings} onClick={() => goTo('settings')} className="self-start">
            {t('spotify.goToSettings')}
          </Button>
        </>
      )}

      {status.state === 'disconnected' && (
        <>
          <Button
            variant="primary"
            icon={Music2}
            onClick={connect}
            disabled={connecting}
            className="self-start"
          >
            {t('spotify.connect')}
          </Button>
          {connecting && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('spotify.connecting')}</p>
          )}
          {connectError && <ErrorText error={connectError} />}
        </>
      )}

      {status.state === 'connected' && <Player premium={status.premium} />}
    </section>
  )
}

function ErrorText({ error }: { error: SpotifyError }): JSX.Element {
  const { t } = useTranslation()
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      {t(`spotify.errors.${error}`)}
    </p>
  )
}

function Player({ premium }: { premium: boolean }): JSX.Element {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.update)
  const [playback, setPlayback] = useState<SpotifyPlayback | null | undefined>(undefined)
  const [error, setError] = useState<SpotifyError | null>(null)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [devices, setDevices] = useState<SpotifyDevice[] | null>(null)
  // While dragging the slider, show its position instead of what Spotify last said
  const [volume, setVolume] = useState<number | null>(null)

  const loadDevices = useCallback(async (): Promise<void> => {
    const result = await platform.spotifyDevices()
    if (result.ok) setDevices(result.value)
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    const result = await platform.spotifyPlayback()
    if (result.ok) {
      setPlayback(result.value)
      setError(null)
    } else {
      setError(result.error)
    }
    // With nothing active anywhere, look for the devices where Spotify is open
    if ((result.ok && result.value === null) || (!result.ok && result.error === 'noDevice')) {
      loadDevices()
    }
  }, [loadDevices])

  useEffect(() => {
    const first = setTimeout(refresh, 0)
    const timer = setInterval(refresh, REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [refresh])

  useEffect(() => {
    platform.spotifyPlaylists().then((result) => result.ok && setPlaylists(result.value))
  }, [])

  // `undefined` until Spotify has answered once, so nothing flashes on screen
  const noDevice = error === 'noDevice' || (!error && playback === null)

  const run = async (command: SpotifyCommand): Promise<void> => {
    const result = await platform.spotifyCommand(command)
    if (!result.ok) setError(result.error)
    // Spotify takes a moment to reflect the change
    setTimeout(refresh, 600)
  }

  const choosePlaylist = (uri: string): void => {
    const playlist = playlists.find((option) => option.uri === uri)
    if (!settings || !playlist) return
    updateSettings({
      spotify: { ...settings.spotify, studyPlaylistUri: uri, studyPlaylistName: playlist.name }
    })
    run({ type: 'playPlaylist', uri })
  }

  const track = playback?.track
  const device = playback?.device
  const studyPlaylist = settings?.spotify.studyPlaylistUri ?? ''

  return (
    <div className="flex flex-col gap-3">
      {!premium && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {t('spotify.notPremium')}
        </p>
      )}

      <div className="flex items-center gap-3">
        {track?.imageUrl ? (
          <img src={track.imageUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
            <Music2 className="size-6 text-zinc-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {track?.title ?? t('spotify.nothingPlaying')}
          </p>
          {track && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{track.artists}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          icon={SkipBack}
          aria-label={t('spotify.previous')}
          onClick={() => run({ type: 'previous' })}
        />
        <Button
          variant="primary"
          icon={playback?.isPlaying ? Pause : Play}
          aria-label={t(playback?.isPlaying ? 'spotify.pause' : 'spotify.play')}
          onClick={() =>
            run(
              playback?.isPlaying
                ? { type: 'pause' }
                : !track && studyPlaylist
                  ? { type: 'playPlaylist', uri: studyPlaylist }
                  : { type: 'play' }
            )
          }
        />
        <Button
          variant="ghost"
          icon={SkipForward}
          aria-label={t('spotify.next')}
          onClick={() => run({ type: 'next' })}
        />
        {device?.supportsVolume && (
          <label className="ml-auto flex items-center gap-2">
            <Volume2 className="size-4 text-zinc-500" aria-hidden="true" />
            <input
              type="range"
              min={0}
              max={100}
              aria-label={t('spotify.volume')}
              value={volume ?? device.volumePercent ?? 50}
              onChange={(event) => setVolume(Number(event.target.value))}
              onPointerUp={() => volume !== null && run({ type: 'volume', percent: volume })}
              onKeyUp={() => volume !== null && run({ type: 'volume', percent: volume })}
              onBlur={() => setVolume(null)}
              className="w-24 accent-emerald-600"
            />
          </label>
        )}
      </div>

      {playlists.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {t('spotify.studyPlaylist')}
          </span>
          <select
            value={studyPlaylist}
            onChange={(event) => choosePlaylist(event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {t('spotify.choosePlaylist')}
            </option>
            {playlists.map((playlist) => (
              <option key={playlist.uri} value={playlist.uri}>
                {playlist.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {device && !noDevice && (
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Speaker className="size-3.5" />
          {t('spotify.playingOn', { device: device.name })}
        </p>
      )}

      {noDevice && (
        <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
          <p className="text-sm font-medium">
            {devices && devices.length > 0
              ? t('spotify.devicesTitle')
              : t('spotify.noDevicesFound')}
          </p>
          {devices?.map((option) => (
            <Button
              key={option.id}
              icon={Speaker}
              onClick={() => run({ type: 'transfer', deviceId: option.id })}
              className="justify-start"
            >
              {option.name}
            </Button>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button icon={ExternalLink} onClick={() => run({ type: 'openApp' })}>
              {t('spotify.openSpotify')}
            </Button>
            <Button variant="ghost" icon={RefreshCw} onClick={loadDevices}>
              {t('spotify.refresh')}
            </Button>
          </div>
        </div>
      )}

      {error && error !== 'noDevice' && <ErrorText error={error} />}
    </div>
  )
}
