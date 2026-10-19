import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { GraduationCap } from 'lucide-react'
import { MAIN_SECTIONS, SECTION_ICONS, type SectionId } from '../sections'

interface SidebarProps {
  current: SectionId
  onSelect: (section: SectionId) => void
}

export default function Sidebar({ current, onSelect }: SidebarProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 px-3 py-5 select-none dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6 flex items-center gap-2 px-3">
        <GraduationCap className="size-6 text-indigo-600 dark:text-indigo-400" />
        <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
      </div>

      <ul className="flex flex-col gap-1">
        {MAIN_SECTIONS.map((section) => (
          <li key={section}>
            <NavButton
              section={section}
              active={section === current}
              onClick={() => onSelect(section)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <NavButton
          section="settings"
          active={current === 'settings'}
          onClick={() => onSelect('settings')}
        />
      </div>
    </nav>
  )
}

interface NavButtonProps {
  section: SectionId
  active: boolean
  onClick: () => void
}

function NavButton({ section, active, onClick }: NavButtonProps): JSX.Element {
  const { t } = useTranslation()
  const Icon = SECTION_ICONS[section]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
      }`}
    >
      <Icon className="size-5" />
      {t(`nav.${section}`)}
    </button>
  )
}
