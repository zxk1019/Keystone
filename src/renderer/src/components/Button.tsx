import type { ButtonHTMLAttributes, JSX } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'dangerGhost' | 'ghost'

// Colors live only in the variants: extra color classes in `className` would clash with them
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400',
  secondary: 'border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  dangerGhost: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: LucideIcon
}

/** Pass `aria-label` when the button has only an icon. */
export default function Button({
  variant = 'secondary',
  icon: Icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  const padding = children ? 'px-3 py-1.5' : 'p-2'
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${padding} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {children}
    </button>
  )
}
