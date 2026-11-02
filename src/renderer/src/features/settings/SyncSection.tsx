import { useState, type FormEvent, type JSX, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Cloud, Copy, ExternalLink, LogOut, RefreshCw, UserPlus } from 'lucide-react'
import type { SyncStatus } from '@shared/sync'
import type { Settings, SyncSettings } from '@shared/types'
import { FIREBASE_API_KEY_PATTERN, FIREBASE_PROJECT_ID_PATTERN } from '@shared/validation'
// The same rules the emulator tests use, so what the user publishes is what was tested
import firestoreRules from '../../../../../firebase/firestore.rules?raw'
import Button from '../../components/Button'
import Field from '../../components/Field'
import PasswordInput from '../../components/PasswordInput'
import { inputClass, segmentClass, segmentedClass } from '../../components/styles'
import { useSyncStore } from '../../store/syncStore'
import { SettingsSection } from './SettingsLayout'

const CONSOLE_URL = 'https://console.firebase.google.com/'

const CONFIG_PATTERNS: Record<keyof SyncSettings, RegExp> = {
  apiKey: FIREBASE_API_KEY_PATTERN,
  projectId: FIREBASE_PROJECT_ID_PATTERN
}

interface SyncSectionProps {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
}

/** Ajustes → Sincronización: the Firebase project, the account and how the sync is going. */
export default function SyncSection({ settings, update }: SyncSectionProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const status = useSyncStore((state) => state.status)
  const busy = useSyncStore((state) => state.busy)
  const error = useSyncStore((state) => state.error)
  const resetSent = useSyncStore((state) => state.resetSent)
  const signIn = useSyncStore((state) => state.signIn)
  const signOut = useSyncStore((state) => state.signOut)
  const resetPassword = useSyncStore((state) => state.resetPassword)
  const syncNow = useSyncStore((state) => state.syncNow)

  const config = settings.sync
  const [draft, setDraft] = useState<SyncSettings>(config)
  const [invalid, setInvalid] = useState<keyof SyncSettings | null>(null)
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeated, setRepeated] = useState('')
  const [needsEmail, setNeedsEmail] = useState(false)
  const [copied, setCopied] = useState(false)

  const saveConfig = (key: keyof SyncSettings): void => {
    const value = draft[key].trim()
    if (value === config[key]) return
    if (value !== '' && !CONFIG_PATTERNS[key].test(value)) {
      setInvalid(key)
      return
    }
    setInvalid(null)
    update({ sync: { ...config, [key]: value } })
  }

  // A new account asks for the password twice, so a typo does not lock the user out
  const passwordsDiffer = creating && repeated !== password
  // Says so once the second one is as long as the first, not while it is still being typed
  const showDiffer = passwordsDiffer && repeated.length >= password.length && repeated !== ''

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (passwordsDiffer) return
    setNeedsEmail(false)
    if (await signIn(email, password, creating)) {
      setPassword('')
      setRepeated('')
    }
  }

  const chooseCreating = (value: boolean): void => {
    setCreating(value)
    setRepeated('')
    setNeedsEmail(false)
  }

  const handleForgot = (): void => {
    if (!email.trim()) {
      setNeedsEmail(true)
      return
    }
    setNeedsEmail(false)
    resetPassword(email)
  }

  const copyRules = async (): Promise<void> => {
    await navigator.clipboard.writeText(firestoreRules)
    setCopied(true)
  }

  const configField = (key: keyof SyncSettings): JSX.Element => (
    <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {t(`settings.sync.${key}`)}
      </span>
      <input
        value={draft[key]}
        placeholder={t(`settings.sync.${key}Placeholder`)}
        spellCheck={false}
        onChange={(event) => {
          setDraft({ ...draft, [key]: event.target.value })
          setInvalid(null)
        }}
        onBlur={() => saveConfig(key)}
        onKeyDown={(event) => event.key === 'Enter' && saveConfig(key)}
        className={`${inputClass} font-mono`}
      />
    </label>
  )

  const notConfigured = status?.state === 'notConfigured'

  return (
    <SettingsSection title={t('settings.sync.title')} description={t('settings.sync.description')}>
      <div className="flex flex-wrap gap-3">
        {configField('projectId')}
        {configField('apiKey')}
      </div>
      {invalid && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t(`settings.sync.${invalid}Invalid`)}
        </p>
      )}

      {status?.state === 'signedIn' ? (
        <SignedIn
          status={status}
          timeFormat={(time) =>
            new Date(time).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
          }
          onSyncNow={syncNow}
          onSignOut={signOut}
        />
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
          {status?.state === 'signedOut' && status.expired && (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t('settings.sync.expired')}
            </p>
          )}
          <div
            role="radiogroup"
            aria-label={t('settings.sync.account')}
            className={`${segmentedClass} self-start`}
          >
            {[false, true].map((option) => (
              <button
                key={String(option)}
                type="button"
                role="radio"
                aria-checked={creating === option}
                onClick={() => chooseCreating(option)}
                className={segmentClass(creating === option)}
              >
                {option ? t('settings.sync.signUp') : t('settings.sync.signIn')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Field label={t('settings.sync.email')} className="min-w-56 flex-1">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={notConfigured}
                className={inputClass}
              />
            </Field>
            <Field label={t('settings.sync.password')} className="min-w-56 flex-1">
              <PasswordInput
                autoComplete={creating ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={notConfigured}
              />
            </Field>
            {creating && (
              <Field label={t('settings.sync.repeatPassword')} className="min-w-56 flex-1">
                <PasswordInput
                  autoComplete="new-password"
                  value={repeated}
                  onChange={(event) => setRepeated(event.target.value)}
                  disabled={notConfigured}
                  aria-invalid={showDiffer}
                />
              </Field>
            )}
          </div>
          {showDiffer ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {t('settings.sync.passwordsDiffer')}
            </p>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('settings.sync.passwordHint')}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              icon={creating ? UserPlus : Cloud}
              disabled={notConfigured || busy || !email || !password || passwordsDiffer}
            >
              {creating ? t('settings.sync.signUp') : t('settings.sync.signIn')}
            </Button>
            {!creating && (
              <Button variant="ghost" onClick={handleForgot} disabled={notConfigured || busy}>
                {t('settings.sync.forgot')}
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {t(`sync.errors.${error}`)}
            </p>
          )}
          {needsEmail && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {t('settings.sync.resetNeedsEmail')}
            </p>
          )}
          {resetSent && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              {t('settings.sync.resetSent')}
            </p>
          )}
        </form>
      )}

      <details
        open={notConfigured || undefined}
        className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
      >
        <summary className="cursor-pointer font-medium">{t('settings.sync.howTo')}</summary>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t('settings.sync.howToIntro')}</p>
        <ol className="mt-3 flex list-decimal flex-col gap-3 pl-5">
          <Step title={t('settings.sync.step1Title')}>
            {t('settings.sync.step1')}
            <a
              href={CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-start text-indigo-600 underline dark:text-indigo-400"
            >
              {t('settings.sync.openConsole')}
              <ExternalLink className="size-3" />
            </a>
          </Step>
          <Step title={t('settings.sync.step2Title')}>{t('settings.sync.step2')}</Step>
          <Step title={t('settings.sync.step3Title')}>{t('settings.sync.step3')}</Step>
          <Step title={t('settings.sync.step4Title')}>
            {t('settings.sync.step4')}
            <Button variant="primary" icon={Copy} onClick={copyRules} className="self-start">
              {copied ? t('settings.sync.copied') : t('settings.sync.copyRules')}
            </Button>
            <details>
              <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-400">
                {t('settings.sync.showRules')}
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
                {firestoreRules}
              </pre>
            </details>
          </Step>
          <Step title={t('settings.sync.step5Title')}>
            {t('settings.sync.step5')}
            <span>{t('settings.sync.step5Key')}</span>
          </Step>
          <Step title={t('settings.sync.step6Title')}>
            {t('settings.sync.step6')}
            <span>{t('settings.sync.step6Phone')}</span>
          </Step>
        </ol>
      </details>
    </SettingsSection>
  )
}

/** One step of the Firebase guide: a short title and what to click. */
function Step({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <li>
      {/* The flex layout goes inside: on the <li> itself it would hide the number */}
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
        {children}
      </div>
    </li>
  )
}

function SignedIn({
  status,
  timeFormat,
  onSyncNow,
  onSignOut
}: {
  status: Extract<SyncStatus, { state: 'signedIn' }>
  timeFormat: (time: number) => string
  onSyncNow: () => void
  onSignOut: () => void
}): JSX.Element {
  const { t } = useTranslation()

  let line: string
  if (status.syncing) line = t('settings.sync.syncing')
  else if (status.error) line = `${t(`sync.errors.${status.error}`)} ${t('settings.sync.retrying')}`
  else if (status.lastSyncAt)
    line = t('settings.sync.lastSync', { time: timeFormat(status.lastSyncAt) })
  else line = t('settings.sync.notYet')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-emerald-700 dark:text-emerald-400">
          {t('settings.sync.signedInAs', { email: status.email })}
        </span>
        <span
          role="status"
          className={
            status.error && !status.syncing
              ? 'text-red-700 dark:text-red-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }
        >
          {line}
        </span>
        {status.pending > 0 && (
          <span className="text-zinc-500 dark:text-zinc-400">
            {t('settings.sync.pending', { count: status.pending })}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button icon={RefreshCw} onClick={onSyncNow} disabled={status.syncing}>
          {t('settings.sync.syncNow')}
        </Button>
        <Button variant="ghost" icon={LogOut} onClick={onSignOut}>
          {t('settings.sync.signOut')}
        </Button>
      </div>
    </div>
  )
}
