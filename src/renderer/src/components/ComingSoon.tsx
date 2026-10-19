import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { SECTION_ICONS, type SectionId } from '../sections'
import PageHeader from './PageHeader'

interface ComingSoonProps {
  section: SectionId
  /** Development phase (docs/especificacion.md, section 8) that builds this section */
  phase: number
}

/** Temporary page for sections that are not built yet. */
export default function ComingSoon({ section, phase }: ComingSoonProps): JSX.Element {
  const { t } = useTranslation()
  const Icon = SECTION_ICONS[section]

  return (
    <div className="flex h-full flex-col px-8 py-8">
      <PageHeader title={t(`nav.${section}`)} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400">
        <Icon className="size-12 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
        <p>{t('placeholder.comingInPhase', { phase })}</p>
      </div>
    </div>
  )
}
