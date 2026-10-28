import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RotateCw, Sparkles, X } from 'lucide-react'
import { useUpdateStore } from '../store/updateStore'
import Button from './Button'

/**
 * A strip above the screens when there is a new version: on the PC it is already downloaded
 * and installs with a restart; on the phone the button opens the download of the APK.
 */
export default function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const status = useUpdateStore((state) => state.status)
  const dismissed = useUpdateStore((state) => state.dismissed)
  const install = useUpdateStore((state) => state.install)
  const dismiss = useUpdateStore((state) => state.dismiss)

  if (status?.state !== 'ready' && status?.state !== 'available') return null
  if (dismissed === status.version) return null
  const ready = status.state === 'ready'

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100"
    >
      <Sparkles className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
      <span className="min-w-0 flex-1">
        {t(ready ? 'updates.banner.ready' : 'updates.banner.available', {
          version: status.version
        })}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="primary" icon={ready ? RotateCw : Download} onClick={install}>
          {t(ready ? 'updates.restart' : 'updates.download')}
        </Button>
        <Button
          variant="ghost"
          icon={X}
          aria-label={t('updates.later')}
          title={t('updates.later')}
          onClick={() => dismiss(status.version)}
        />
      </div>
    </div>
  )
}
