import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { MAIN_SECTIONS, SECTION_ICONS, type SectionId } from '../sections'
import { StudyCountdown } from './Sidebar'

interface BottomNavProps {
  current: SectionId
  onSelect: (section: SectionId) => void
}

const SECTIONS: SectionId[] = [...MAIN_SECTIONS, 'settings']

/** The navigation on phones, at the bottom of the screen; wider screens have the sidebar. */
export default function BottomNav({ current, onSelect }: BottomNavProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="safe-bottom flex shrink-0 border-t border-zinc-200 bg-zinc-50 select-none md:hidden dark:border-zinc-800 dark:bg-zinc-900">
      {SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section]
        const active = section === current
        return (
          <button
            key={section}
            type="button"
            onClick={() => onSelect(section)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors ${
              active ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Icon className="size-5" />
            {/* While the timer runs, the time left takes the place of the name */}
            {section === 'study' ? (
              <StudyCountdown fallback={t(`nav.${section}`)} />
            ) : (
              <span className="max-w-full truncate">{t(`nav.${section}`)}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
