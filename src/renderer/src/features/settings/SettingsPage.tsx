import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Monitor, Moon, Pencil, Sun, Upload, type LucideIcon } from 'lucide-react'
import { LANGUAGES, THEMES, type Language, type ThemeSetting } from '@shared/types'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import { inputClass, segmentClass, segmentedClass } from '../../components/styles'
import { platform } from '../../platform'
import { useNavigationStore } from '../../store/navigationStore'
import { useSettingsStore } from '../../store/settingsStore'
import NotificationsSection from './NotificationsSection'
import { SettingsRow, SettingsSection } from './SettingsLayout'

const THEME_ICONS: Record<ThemeSetting, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor
}

type Status = { kind: 'success' | 'error'; text: string }

export default function SettingsPage(): JSX.Element | null {
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const update = useSettingsStore((state) => state.update)
  const openScheduleEditor = useNavigationStore((state) => state.openScheduleEditor)
  const [status, setStatus] = useState<Status | null>(null)

  if (!settings) return null

  const showError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error)
    setStatus({ kind: 'error', text: t('settings.data.error', { message }) })
  }

  const handleExport = async (): Promise<void> => {
    setStatus(null)
    try {
      const result = await platform.exportData()
      if (result.status === 'saved') {
        setStatus({ kind: 'success', text: t('settings.data.exported', { path: result.path }) })
      }
    } catch (error) {
      showError(error)
    }
  }

  const handleImport = async (): Promise<void> => {
    setStatus(null)
    try {
      const result = await platform.importData()
      if (result.status === 'imported') {
        setStatus({ kind: 'success', text: t('settings.data.imported') })
      } else if (result.status === 'invalid') {
        setStatus({ kind: 'error', text: t('settings.data.invalid') })
      }
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-8 py-8">
      <PageHeader title={t('nav.settings')} />

      <SettingsSection title={t('settings.appearance')}>
        <SettingsRow label={t('settings.theme.label')}>
          <div role="radiogroup" aria-label={t('settings.theme.label')} className={segmentedClass}>
            {THEMES.map((theme) => {
              const Icon = THEME_ICONS[theme]
              const active = settings.theme === theme
              return (
                <button
                  key={theme}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ theme })}
                  className={segmentClass(active)}
                >
                  <Icon className="size-4" />
                  {t(`settings.theme.${theme}`)}
                </button>
              )
            })}
          </div>
        </SettingsRow>

        <SettingsRow label={t('settings.language.label')}>
          <select
            value={settings.language}
            onChange={(event) => update({ language: event.target.value as Language })}
            className={inputClass}
          >
            {LANGUAGES.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title={t('settings.schedule.title')}
        description={t('settings.schedule.description')}
      >
        <Button icon={Pencil} onClick={openScheduleEditor} className="self-start">
          {t('settings.schedule.open')}
        </Button>
      </SettingsSection>

      <NotificationsSection settings={settings} update={update} />

      <SettingsSection
        title={t('settings.data.title')}
        description={t('settings.data.description')}
      >
        <div className="flex flex-wrap gap-3">
          <Button icon={Download} onClick={handleExport}>
            {t('settings.data.export')}
          </Button>
          <Button icon={Upload} onClick={handleImport}>
            {t('settings.data.import')}
          </Button>
        </div>
        {status && (
          <p
            role="status"
            className={`text-sm break-all ${
              status.kind === 'success'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {status.text}
          </p>
        )}
      </SettingsSection>
    </div>
  )
}
