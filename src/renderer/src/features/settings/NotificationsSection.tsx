import { useEffect, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { BellRing } from 'lucide-react'
import {
  EXAM_REMINDER_DAYS,
  OVERDUE_REPEAT_HOURS,
  type NotificationSettings,
  type Settings
} from '@shared/types'
import Button from '../../components/Button'
import { inputClass } from '../../components/styles'
import Switch from '../../components/Switch'
import { platform } from '../../platform'
import { SettingsRow, SettingsSection } from './SettingsLayout'

interface NotificationsSectionProps {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
}

/** Ajustes → Avisos: what to be reminded of, when, and starting with Windows. */
export default function NotificationsSection({
  settings,
  update
}: NotificationsSectionProps): JSX.Element {
  const { t } = useTranslation()
  const [packaged, setPackaged] = useState<boolean | null>(null)
  const [testSent, setTestSent] = useState(false)
  const options = settings.notifications

  useEffect(() => {
    platform.getAppInfo().then((info) => setPackaged(info.packaged))
  }, [])

  // The main process expects the notification options as a whole
  const change = (patch: Partial<NotificationSettings>): Promise<void> =>
    update({ notifications: { ...options, ...patch } })

  const toggleExamDay = (day: number): Promise<void> =>
    change({
      examDaysBefore: options.examDaysBefore.includes(day)
        ? options.examDaysBefore.filter((d) => d !== day)
        : [...options.examDaysBefore, day]
    })

  const sendTest = async (): Promise<void> => {
    await platform.sendTestNotification()
    setTestSent(true)
  }

  const off = !options.enabled

  return (
    <SettingsSection
      title={t('settings.notifications.title')}
      description={t('settings.notifications.description')}
    >
      <SettingsRow label={t('settings.notifications.enabled')}>
        <Switch
          checked={options.enabled}
          onChange={(enabled) => change({ enabled })}
          label={t('settings.notifications.enabled')}
        />
      </SettingsRow>

      <fieldset disabled={off} className={`flex flex-col gap-4 ${off ? 'opacity-50' : ''}`}>
        <SettingsRow label={t('settings.notifications.summaryTime')}>
          <input
            type="time"
            step={300}
            value={options.summaryTime}
            onChange={(event) => event.target.value && change({ summaryTime: event.target.value })}
            className={inputClass}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.notifications.overdueRepeat')}>
          <select
            value={options.overdueRepeatHours}
            onChange={(event) =>
              change({
                overdueRepeatHours: Number(
                  event.target.value
                ) as NotificationSettings['overdueRepeatHours']
              })
            }
            className={inputClass}
          >
            {OVERDUE_REPEAT_HOURS.map((hours) => (
              <option key={hours} value={hours}>
                {hours === 0
                  ? t('settings.notifications.repeatNever')
                  : t('settings.notifications.repeatEvery', { count: hours })}
              </option>
            ))}
          </select>
        </SettingsRow>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {t('settings.notifications.examDays')}
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAM_REMINDER_DAYS.map((day) => {
              const active = options.examDaysBefore.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleExamDay(day)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                      : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                  }`}
                >
                  {t('settings.notifications.examDay', { count: day })}
                </button>
              )
            })}
          </div>
        </div>

        <SettingsRow label={t('settings.notifications.quietHours')}>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="time"
              step={300}
              aria-label={`${t('settings.notifications.quietHours')} (1)`}
              value={options.quietStart}
              onChange={(event) => event.target.value && change({ quietStart: event.target.value })}
              className={inputClass}
            />
            {t('settings.notifications.quietTo')}
            <input
              type="time"
              step={300}
              aria-label={`${t('settings.notifications.quietHours')} (2)`}
              value={options.quietEnd}
              onChange={(event) => event.target.value && change({ quietEnd: event.target.value })}
              className={inputClass}
            />
          </div>
        </SettingsRow>

        <div className="flex flex-col gap-2">
          <Button icon={BellRing} onClick={sendTest} className="self-start">
            {t('settings.notifications.test')}
          </Button>
          {testSent && (
            <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('settings.notifications.testSent')}
            </p>
          )}
        </div>
      </fieldset>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <SettingsRow
          label={t('settings.startup.title')}
          hint={
            packaged === false
              ? t('settings.startup.onlyInstalled')
              : t('settings.startup.description')
          }
        >
          <Switch
            checked={settings.startWithWindows}
            onChange={(startWithWindows) => update({ startWithWindows })}
            label={t('settings.startup.title')}
            disabled={packaged !== true}
          />
        </SettingsRow>
      </div>
    </SettingsSection>
  )
}
