import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, ExternalLink, RefreshCw, RotateCw } from 'lucide-react'
import { RELEASES_PAGE, type UpdateStatus } from '@shared/updates'
import Button from '../../components/Button'
import { formatClock } from '../../lib/time'
import { platform } from '../../platform'
import { useUpdateStore } from '../../store/updateStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'

/** The installed version, how the last look for a new one went and the button to look again. */
export default function UpdatesSection(): JSX.Element | null {
  const { t, i18n } = useTranslation()
  const status = useUpdateStore((state) => state.status)
  const version = useUpdateStore((state) => state.version)
  const check = useUpdateStore((state) => state.check)
  const install = useUpdateStore((state) => state.install)

  if (!status || !version) return null

  const line = statusLine(status, (time) => formatClock(time, i18n.language))
  const busy = status.state === 'checking' || status.state === 'downloading'

  return (
    <SettingsSection
      title={t('updates.title')}
      description={t(
        platform.capabilities.installsUpdates
          ? 'updates.descriptionAuto'
          : 'updates.descriptionPhone'
      )}
    >
      <SettingsRow label={t('updates.installed')}>
        <span className="text-sm font-medium tabular-nums">{version}</span>
      </SettingsRow>

      <p
        role="status"
        className={`text-sm ${
          status.state === 'error'
            ? 'text-red-700 dark:text-red-400'
            : status.state === 'ready' || status.state === 'available'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        {t(line.key, line.values)}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {status.state === 'ready' || status.state === 'available' ? (
          <Button
            variant="primary"
            icon={status.state === 'ready' ? RotateCw : Download}
            onClick={install}
          >
            {t(status.state === 'ready' ? 'updates.restart' : 'updates.download')}
          </Button>
        ) : (
          <Button icon={RefreshCw} onClick={check} disabled={busy || status.state === 'disabled'}>
            {t('updates.check')}
          </Button>
        )}
        <a
          href={RELEASES_PAGE}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 underline dark:text-indigo-400"
        >
          {t('updates.whatsNew')}
          <ExternalLink className="size-3" />
        </a>
      </div>
    </SettingsSection>
  )
}

type StatusLine = { key: string; values?: Record<string, string | number> }

function statusLine(status: UpdateStatus, clock: (time: number) => string): StatusLine {
  switch (status.state) {
    case 'disabled':
    case 'idle':
    case 'checking':
      return { key: `updates.${status.state}` }
    case 'upToDate':
      return { key: 'updates.upToDate', values: { time: clock(status.checkedAt) } }
    case 'downloading':
      return {
        key: 'updates.downloading',
        values: { version: status.version, percent: status.percent }
      }
    case 'ready':
    case 'available':
      return { key: `updates.${status.state}`, values: { version: status.version } }
    case 'error':
      return { key: 'updates.error' }
  }
}
