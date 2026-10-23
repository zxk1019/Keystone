import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, ExternalLink, LogOut, Music2 } from 'lucide-react'
import { playlistUriFromLink } from '@shared/spotify'
import { SPOTIFY_CLIENT_ID_PATTERN } from '@shared/validation'
import type { Settings, SpotifySettings } from '@shared/types'
import Button from '../../components/Button'
import { inputClass } from '../../components/styles'
import { platform } from '../../platform'
import Switch from '../../components/Switch'
import { useSpotifyStore } from '../../store/spotifyStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'

// Must match REDIRECT_URI in src/main/spotify/pkce.ts
const REDIRECT_URI = 'http://127.0.0.1:43821/callback'
const DASHBOARD_URL = 'https://developer.spotify.com/dashboard'

interface SpotifySectionProps {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
}

/** Ajustes → Spotify: everything on the PC; on the phone, only the study playlist to open. */
export default function SpotifySection(props: SpotifySectionProps): JSX.Element {
  return platform.capabilities.spotifyControl ? (
    <SpotifyControlSection {...props} />
  ) : (
    <PhoneSpotifySection {...props} />
  )
}

/** On the phone the study playlist comes from a link copied in Spotify. */
function PhoneSpotifySection({ settings, update }: SpotifySectionProps): JSX.Element {
  const { t } = useTranslation()
  const options = settings.spotify
  const [link, setLink] = useState(
    options.studyPlaylistUri
      ? `https://open.spotify.com/playlist/${options.studyPlaylistUri.split(':')[2]}`
      : ''
  )
  const [invalid, setInvalid] = useState(false)

  const save = (): void => {
    const uri = link.trim() === '' ? '' : playlistUriFromLink(link)
    if (uri === null) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (uri !== options.studyPlaylistUri) {
      update({ spotify: { ...options, studyPlaylistUri: uri, studyPlaylistName: '' } })
    }
  }

  return (
    <SettingsSection
      title={t('settings.spotify.title')}
      description={t('settings.spotify.phoneDescription')}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {t('settings.spotify.playlistLink')}
        </span>
        <input
          type="url"
          value={link}
          placeholder={t('settings.spotify.playlistLinkPlaceholder')}
          spellCheck={false}
          onChange={(event) => {
            setLink(event.target.value)
            setInvalid(false)
          }}
          onBlur={save}
          onKeyDown={(event) => event.key === 'Enter' && save()}
          className={inputClass}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('settings.spotify.playlistLinkHint')}
        </span>
      </label>
      {invalid && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t('settings.spotify.playlistLinkInvalid')}
        </p>
      )}
    </SettingsSection>
  )
}

/** Client ID, connection and what happens with the music while studying. */
function SpotifyControlSection({ settings, update }: SpotifySectionProps): JSX.Element {
  const { t } = useTranslation()
  const status = useSpotifyStore((state) => state.status)
  const connecting = useSpotifyStore((state) => state.connecting)
  const connectError = useSpotifyStore((state) => state.error)
  const connect = useSpotifyStore((state) => state.connect)
  const disconnect = useSpotifyStore((state) => state.disconnect)
  const options = settings.spotify
  const [clientId, setClientId] = useState(options.clientId)
  const [invalid, setInvalid] = useState(false)
  const [copied, setCopied] = useState(false)

  const change = (patch: Partial<SpotifySettings>): Promise<void> =>
    update({ spotify: { ...options, ...patch } })

  const saveClientId = (): void => {
    const value = clientId.trim()
    if (value === options.clientId) return
    if (value !== '' && !SPOTIFY_CLIENT_ID_PATTERN.test(value)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    change({ clientId: value })
  }

  const copyRedirect = async (): Promise<void> => {
    await navigator.clipboard.writeText(REDIRECT_URI)
    setCopied(true)
  }

  return (
    <SettingsSection
      title={t('settings.spotify.title')}
      description={t('settings.spotify.description')}
    >
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {t('settings.spotify.clientId')}
        </span>
        <input
          value={clientId}
          placeholder={t('settings.spotify.clientIdPlaceholder')}
          spellCheck={false}
          onChange={(event) => {
            setClientId(event.target.value)
            setInvalid(false)
          }}
          onBlur={saveClientId}
          onKeyDown={(event) => event.key === 'Enter' && saveClientId()}
          className={`${inputClass} font-mono`}
        />
        {invalid && (
          <p role="alert" className="text-red-700 dark:text-red-400">
            {t('settings.spotify.clientIdInvalid')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status?.state === 'connected' ? (
          <>
            <span className="text-sm text-emerald-700 dark:text-emerald-400">
              {t('spotify.connectedAs', { name: status.userName || 'Spotify' })}
            </span>
            <Button variant="ghost" icon={LogOut} onClick={disconnect}>
              {t('spotify.disconnect')}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            icon={Music2}
            onClick={connect}
            disabled={status?.state !== 'disconnected' || connecting}
          >
            {t('spotify.connect')}
          </Button>
        )}
        {connecting && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('spotify.connecting')}
          </span>
        )}
      </div>
      {connectError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t(`spotify.errors.${connectError}`)}
        </p>
      )}
      {status?.state === 'connected' && !status.premium && (
        <p className="text-sm text-amber-800 dark:text-amber-300">{t('spotify.notPremium')}</p>
      )}

      <SettingsRow label={t('settings.spotify.pauseOnBreak')}>
        <Switch
          checked={options.pauseOnBreak}
          onChange={(pauseOnBreak) => change({ pauseOnBreak })}
          label={t('settings.spotify.pauseOnBreak')}
        />
      </SettingsRow>
      <SettingsRow label={t('settings.spotify.playOnStudyStart')}>
        <Switch
          checked={options.playOnStudyStart}
          onChange={(playOnStudyStart) => change({ playOnStudyStart })}
          label={t('settings.spotify.playOnStudyStart')}
        />
      </SettingsRow>

      <details className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <summary className="cursor-pointer font-medium">{t('settings.spotify.howTo')}</summary>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5">
          <li>
            {t('settings.spotify.step1')}{' '}
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 underline dark:text-indigo-400"
            >
              {t('settings.spotify.openDashboard')}
              <ExternalLink className="size-3" />
            </a>
          </li>
          <li>
            {/* The flex layout goes inside: on the <li> itself it would hide the number */}
            <div className="flex flex-col gap-2">
              {t('settings.spotify.step2')}
              <span className="flex items-center gap-2">
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-800">
                  {REDIRECT_URI}
                </code>
                <Button variant="ghost" icon={Copy} onClick={copyRedirect}>
                  {copied ? t('settings.spotify.copied') : t('settings.spotify.copy')}
                </Button>
              </span>
            </div>
          </li>
          <li>{t('settings.spotify.step3')}</li>
          <li>{t('settings.spotify.step4')}</li>
        </ol>
      </details>
    </SettingsSection>
  )
}
