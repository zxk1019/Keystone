import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { STUDY_LIMITS, type Settings, type StudySettings } from '@shared/types'
import { inputClass } from '../../components/styles'
import { SettingsRow, SettingsSection } from './SettingsLayout'

interface StudySectionProps {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
}

/** Ajustes → Estudio: length of the study blocks and breaks. */
export default function StudySection({ settings, update }: StudySectionProps): JSX.Element {
  const { t } = useTranslation()

  const change = (key: keyof StudySettings, raw: string): void => {
    const minutes = Number(raw)
    const { min, max } = STUDY_LIMITS[key]
    // Ignores what is still being typed (empty, out of range) until it is a valid number
    if (Number.isInteger(minutes) && minutes >= min && minutes <= max) {
      update({ study: { ...settings.study, [key]: minutes } })
    }
  }

  return (
    <SettingsSection
      title={t('settings.study.title')}
      description={t('settings.study.description')}
    >
      {(['focusMinutes', 'breakMinutes'] as const).map((key) => (
        <SettingsRow key={key} label={t(`settings.study.${key}`)}>
          <input
            type="number"
            min={STUDY_LIMITS[key].min}
            max={STUDY_LIMITS[key].max}
            defaultValue={settings.study[key]}
            onChange={(event) => change(key, event.target.value)}
            className={`${inputClass} w-24`}
          />
        </SettingsRow>
      ))}
    </SettingsSection>
  )
}
