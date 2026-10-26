import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../components/Button'
import Dialog from '../../components/Dialog'
import PageHeader from '../../components/PageHeader'
import { useStudyStore } from '../../store/studyStore'
import SpotifyPanel from './SpotifyPanel'
import TimerCard from './TimerCard'

const TECHNIQUES = [
  'activeRecall',
  'spacedRepetition',
  'feynman',
  'interleaving',
  'selfExplanation',
  'mindMaps',
  'pomodoro'
] as const

type Technique = (typeof TECHNIQUES)[number]

export default function StudyPage(): JSX.Element | null {
  const { t } = useTranslation()
  const timer = useStudyStore((state) => state.timer)
  const [open, setOpen] = useState<Technique | null>(null)

  if (!timer) return null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <PageHeader title={t('nav.study')} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <TimerCard timer={timer} />
        <SpotifyPanel />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('study.techniques.title')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TECHNIQUES.map((technique) => (
            <button
              key={technique}
              type="button"
              onClick={() => setOpen(technique)}
              className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
            >
              <span className="font-medium">{t(`study.techniques.items.${technique}.name`)}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {t(`study.techniques.items.${technique}.summary`)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {open && <TechniqueDialog key={open} technique={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function TechniqueDialog({
  technique,
  onClose
}: {
  technique: Technique
  onClose: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const key = `study.techniques.items.${technique}`

  return (
    <Dialog
      title={t(`${key}.name`)}
      onClose={onClose}
      onSubmit={onClose}
      footer={
        <Button variant="primary" type="submit" data-autofocus>
          {t('study.close')}
        </Button>
      }
    >
      {(['what', 'how', 'when'] as const).map((part) => (
        <div key={part} className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {t(`study.techniques.${part}`)}
          </h3>
          <p className="text-sm leading-relaxed">{t(`${key}.${part}`)}</p>
        </div>
      ))}
    </Dialog>
  )
}
