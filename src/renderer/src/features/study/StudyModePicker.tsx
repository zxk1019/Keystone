import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Monitor, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { STUDY_LIMITS, STUDY_MODES, type StudyMode, type StudySettings } from '@shared/types'
import Field from '../../components/Field'
import { inputClass, segmentClass } from '../../components/styles'
import { platform } from '../../platform'
import { useSettingsStore } from '../../store/settingsStore'

const ICONS: Record<StudyMode, LucideIcon> = {
  computer: Monitor,
  noComputer: BookOpen,
  custom: SlidersHorizontal
}

/**
 * The 20-20-20 at the computer, 45 + 5 without it, or the user's own lengths. Only while the
 * timer is stopped: a block that has started keeps its length.
 */
export default function StudyModePicker({ locked }: { locked: boolean }): JSX.Element | null {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  if (!settings) return null

  const mode = settings.studyMode ?? platform.defaultStudyMode

  const changeMinutes = (key: keyof StudySettings, raw: string): void => {
    const minutes = Number(raw)
    const { min, max } = STUDY_LIMITS[key]
    // Ignores what is still being typed (empty, out of range) until it is a valid number
    if (Number.isInteger(minutes) && minutes >= min && minutes <= max) {
      void update({ study: { ...settings.study, [key]: minutes } })
    }
  }

  return (
    <div className="@container flex w-full flex-col gap-2">
      <div
        role="radiogroup"
        aria-label={t('study.mode.title')}
        // The look of segmentedClass, but as a grid so the three options fit a narrow phone; the
        // labels go under the icons until the picker is wide enough (@md) to have them beside
        className="grid grid-cols-3 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800"
      >
        {STUDY_MODES.map((option) => {
          const Icon = ICONS[option]
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={mode === option}
              disabled={locked}
              onClick={() => void update({ studyMode: option })}
              className={`${segmentClass(mode === option)} flex-col justify-center px-2 py-1.5 text-center leading-tight disabled:cursor-not-allowed disabled:opacity-60 @md:flex-row`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{t(`study.mode.${option}`)}</span>
            </button>
          )
        })}
      </div>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        {locked ? t('study.mode.locked') : t(`study.mode.${mode}Hint`)}
      </p>

      {mode === 'custom' && (
        <div className="flex justify-center gap-3">
          {(['focusMinutes', 'breakMinutes'] as const).map((key) => (
            <Field key={key} label={t(`study.mode.${key}`)}>
              <input
                type="number"
                min={STUDY_LIMITS[key].min}
                max={STUDY_LIMITS[key].max}
                disabled={locked}
                defaultValue={settings.study[key]}
                onChange={(event) => changeMinutes(key, event.target.value)}
                className={`${inputClass} w-28`}
              />
            </Field>
          ))}
        </div>
      )}
    </div>
  )
}
