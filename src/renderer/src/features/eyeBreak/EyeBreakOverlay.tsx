import { useEffect, useRef, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { useNow } from '../../hooks/useNow'
import i18n from '../../i18n'
import { playChime } from '../../lib/chime'
import { platform } from '../../platform'

/** Leaves time for the chime to play before the window closes */
const CLOSE_DELAY_MS = 1200

function readParams(): { primary: boolean; endsAt: number; durationMs: number } {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  return {
    primary: params.get('primary') === '1',
    endsAt: Number(params.get('endsAt')),
    durationMs: Number(params.get('duration'))
  }
}

const { primary, endsAt, durationMs } = readParams()

/**
 * The dark screen of the 20-20-20 rule. Each monitor gets one; only the main one shows the
 * countdown and the Skip button and tells the main process when time is up.
 */
export default function EyeBreakOverlay(): JSX.Element {
  const { t } = useTranslation()
  const now = useNow(200)
  const finished = useRef(false)
  const left = Math.max(0, endsAt - now.getTime())

  useEffect(() => {
    platform.getSettings().then((settings) => {
      i18n.changeLanguage(settings.language)
      document.documentElement.lang = settings.language
    })
  }, [])

  useEffect(() => {
    if (!primary || left > 0 || finished.current) return
    finished.current = true
    playChime('breakEnded')
    setTimeout(() => platform.eyeBreakCommand('finish'), CLOSE_DELAY_MS)
  }, [left])

  useEffect(() => {
    if (!primary) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') platform.eyeBreakCommand('skip')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-zinc-950/85 text-white select-none">
      <Eye className="size-14 text-emerald-300" strokeWidth={1.5} />
      <h1 className="px-8 text-center text-3xl font-semibold">{t('eyeBreak.lookAway')}</h1>
      <p className="text-lg text-zinc-300">{t('eyeBreak.hint')}</p>

      {primary && (
        <>
          <span className="text-8xl font-semibold tabular-nums" role="timer">
            {Math.ceil(left / 1000)}
          </span>
          <div className="h-1.5 w-72 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full bg-emerald-400 transition-[width] duration-200 ease-linear"
              style={{ width: `${durationMs > 0 ? (1 - left / durationMs) * 100 : 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => platform.eyeBreakCommand('skip')}
            className="rounded-lg border border-white/30 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
          >
            {t('eyeBreak.skip')}
          </button>
        </>
      )}
    </div>
  )
}
