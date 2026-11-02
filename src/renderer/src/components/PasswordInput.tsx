import { useState, type InputHTMLAttributes, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { inputClass } from './styles'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/** A password field with an eye button that shows or hides what has been typed. */
export default function PasswordInput(props: PasswordInputProps): JSX.Element {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const label = visible ? t('common.hidePassword') : t('common.showPassword')

  return (
    <div className="relative flex">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        spellCheck={false}
        className={`${inputClass} w-full pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        disabled={props.disabled}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
