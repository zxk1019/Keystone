import type { JSX, ReactNode } from 'react'

/** A bordered block of related settings with a heading. */
export function SettingsSection(props: {
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

/** One setting: its name on the left, the control on the right, an optional hint below. */
export function SettingsRow({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        {hint && <span className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
