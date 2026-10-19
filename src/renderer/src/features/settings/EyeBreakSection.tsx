import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Play } from 'lucide-react'
import type { EyeBreakSettings, Settings } from '@shared/types'
import Button from '../../components/Button'
import { inputClass } from '../../components/styles'
import Switch from '../../components/Switch'
import { useEyeBreakStore } from '../../store/eyeBreakStore'
import EyeBreakNotice from '../eyeBreak/EyeBreakNotice'
import { SettingsRow, SettingsSection } from './SettingsLayout'

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60]
const DURATION_OPTIONS = [10, 20, 30, 60]
const IDLE_OPTIONS = [2, 5, 10]

interface EyeBreakSectionProps {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
}

/** Ajustes → Descanso de la vista (20-20-20). */
export default function EyeBreakSection({ settings, update }: EyeBreakSectionProps): JSX.Element {
  const { t } = useTranslation()
  const status = useEyeBreakStore((state) => state.status)
  const command = useEyeBreakStore((state) => state.command)
  const options = settings.eyeBreak

  const change = (patch: Partial<EyeBreakSettings>): Promise<void> =>
    update({ eyeBreak: { ...options, ...patch } })

  /** A select of numbers; keeps the current value listed even if it is not a usual option */
  const numberSelect = (
    key: 'intervalMinutes' | 'durationSeconds' | 'idleResetMinutes',
    values: number[],
    unit: 'minutes' | 'seconds'
  ): JSX.Element => (
    <select
      value={options[key]}
      onChange={(event) => change({ [key]: Number(event.target.value) })}
      className={inputClass}
    >
      {[...new Set([...values, options[key]])]
        .sort((a, b) => a - b)
        .map((value) => (
          <option key={value} value={value}>
            {t(`settings.eyeBreak.${unit}`, { count: value })}
          </option>
        ))}
    </select>
  )

  return (
    <SettingsSection
      title={t('settings.eyeBreak.title')}
      description={t('settings.eyeBreak.description')}
    >
      <SettingsRow label={t('settings.eyeBreak.enabled')}>
        <Switch
          checked={options.enabled}
          onChange={(enabled) => change({ enabled })}
          label={t('settings.eyeBreak.title')}
        />
      </SettingsRow>

      <fieldset
        disabled={!options.enabled}
        className={`flex flex-col gap-4 ${options.enabled ? '' : 'opacity-50'}`}
      >
        <SettingsRow label={t('settings.eyeBreak.interval')}>
          {numberSelect('intervalMinutes', INTERVAL_OPTIONS, 'minutes')}
        </SettingsRow>
        <SettingsRow label={t('settings.eyeBreak.duration')}>
          {numberSelect('durationSeconds', DURATION_OPTIONS, 'seconds')}
        </SettingsRow>
        <SettingsRow label={t('settings.eyeBreak.idle')}>
          {numberSelect('idleResetMinutes', IDLE_OPTIONS, 'minutes')}
        </SettingsRow>

        <div className="flex flex-wrap items-center gap-3">
          <Button icon={Eye} onClick={() => command('test')}>
            {t('settings.eyeBreak.test')}
          </Button>
          {status?.pause && (
            <Button icon={Play} onClick={() => command('resume')}>
              {t('settings.eyeBreak.resume')}
            </Button>
          )}
          <EyeBreakNotice />
        </div>
      </fieldset>
    </SettingsSection>
  )
}
