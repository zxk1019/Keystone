import { useState, type JSX, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Monitor, Moon, Sun, Upload, type LucideIcon } from 'lucide-react'
import { LANGUAGES, THEMES, type Language, type ThemeSetting } from '@shared/types'
import PageHeader from '../../components/PageHeader'
import { platform } from '../../platform'
import { useSettingsStore } from '../../store/settingsStore'

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
          <div
            role="radiogroup"
            aria-label={t('settings.theme.label')}
            className="inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800"
          >
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
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
        title={t('settings.data.title')}
        description={t('settings.data.description')}
      >
        <div className="flex flex-wrap gap-3">
          <ActionButton icon={Download} label={t('settings.data.export')} onClick={handleExport} />
          <ActionButton icon={Upload} label={t('settings.data.import')} onClick={handleImport} />
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

function SettingsSection(props: {
  title: string
  description?: string
  children: ReactNode
}): JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div>
        <h2 className="font-semibold">{props.title}</h2>
        {props.description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{props.description}</p>
        )}
      </div>
      {props.children}
    </section>
  )
}

function SettingsRow({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </div>
  )
}

function ActionButton(props: {
  icon: LucideIcon
  label: string
  onClick: () => void
}): JSX.Element {
  const Icon = props.icon
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <Icon className="size-4" />
      {props.label}
    </button>
  )
}
