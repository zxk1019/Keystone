import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { SUBJECT_COLORS, type SubjectColor } from '@shared/types'
import { SUBJECT_STYLES } from '../features/agenda/subjectStyles'

/** The palette of subjects and habits, as a row of round swatches. */
export default function ColorPicker({
  label,
  value,
  onChange
}: {
  label: string
  value: SubjectColor
  onChange: (color: SubjectColor) => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {SUBJECT_COLORS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            aria-label={t(`colors.${option}`)}
            title={t(`colors.${option}`)}
            onClick={() => onChange(option)}
            className={`flex size-8 items-center justify-center rounded-full ${SUBJECT_STYLES[option].solid} ${
              option === value
                ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-900'
                : ''
            }`}
          >
            {option === value && <Check className="size-4 text-white" />}
          </button>
        ))}
      </div>
    </div>
  )
}
