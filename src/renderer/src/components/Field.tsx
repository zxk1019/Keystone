import type { JSX, ReactNode } from 'react'

/** A form control with its label above it. */
export default function Field({
  label,
  children,
  className = ''
}: {
  label: string
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  )
}
