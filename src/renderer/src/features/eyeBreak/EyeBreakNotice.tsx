import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { formatClock } from '../../lib/time'
import { useEyeBreakStore } from '../../store/eyeBreakStore'

/** "Next eye break in 12 min" or "paused until 18:30"; nothing when the 20-20-20 is off. */
export default function EyeBreakNotice(): JSX.Element | null {
  const { t, i18n } = useTranslation()
  const status = useEyeBreakStore((state) => state.status)
  if (!status?.enabled) return null

  let text: string
  if (status.pause === 'restart') text = t('eyeBreak.pausedRestart')
  else if (status.pause) {
    text = t('eyeBreak.pausedUntil', { time: formatClock(status.pause.until, i18n.language) })
  } else text = t('eyeBreak.next', { count: Math.max(1, Math.ceil(status.nextInMs / 60_000)) })

  return (
    <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <Eye className="size-3.5" />
      {text}
    </p>
  )
}
