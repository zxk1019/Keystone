import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOff, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { remainingMs, type TimerState } from '@shared/studyTimer'
import Button from '../../components/Button'
import { useNow } from '../../hooks/useNow'
import { formatClock, formatCountdown } from '../../lib/time'
import { useStudyStore } from '../../store/studyStore'
import EyeBreakNotice from '../eyeBreak/EyeBreakNotice'

const RADIUS = 96
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TimerCard({ timer }: { timer: TimerState }): JSX.Element {
  const { t, i18n } = useTranslation()
  const command = useStudyStore((state) => state.command)
  const nextTip = useStudyStore((state) => state.nextTip)
  const now = useNow(1000)

  const left = remainingMs(timer, now.getTime())
  const progress = timer.durationMs > 0 ? 1 - left / timer.durationMs : 0
  const onBreak = timer.phase === 'break'

  let status: string
  if (timer.status === 'idle') status = t('study.ready')
  else if (timer.status === 'paused') status = t('study.paused')
  else
    status = t(onBreak ? 'study.backAt' : 'study.breakAt', {
      time: formatClock(timer.endsAt ?? now.getTime(), i18n.language)
    })

  const start = (): void => {
    // A new study block brings a new tip
    if (timer.status === 'idle' && timer.phase === 'focus') nextTip()
    command('start')
  }

  return (
    <section className="flex flex-col items-center gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {t(`study.phase.${timer.phase}`)} · {t('study.block', { count: timer.block })}
      </p>

      <div className="relative size-56">
        <svg viewBox="0 0 220 220" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${
              onBreak ? 'stroke-emerald-500' : 'stroke-indigo-600 dark:stroke-indigo-400'
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-5xl font-semibold tabular-nums" role="timer" aria-live="off">
            {formatCountdown(left)}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{status}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {timer.status === 'running' ? (
          <Button icon={Pause} onClick={() => command('pause')}>
            {t('study.pause')}
          </Button>
        ) : (
          <Button variant="primary" icon={Play} onClick={start}>
            {timer.status === 'paused' ? t('study.resume') : t('study.start')}
          </Button>
        )}
        <Button icon={SkipForward} onClick={() => command('skip')}>
          {t('study.skip')}
        </Button>
        <Button
          variant="ghost"
          icon={RotateCcw}
          onClick={() => command('reset')}
          disabled={timer.status === 'idle' && timer.block === 1}
        >
          {t('study.reset')}
        </Button>
      </div>

      {timer.status === 'running' && !onBreak && (
        <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <BellOff className="size-3.5" />
          {t('study.silenced')}
        </p>
      )}
      <EyeBreakNotice />
    </section>
  )
}
