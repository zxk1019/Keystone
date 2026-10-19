import type { JSX, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** A bordered box with a heading, used for the blocks of the Today screen. */
export default function Card({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon?: LucideIcon
  children: ReactNode
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="flex items-center gap-2 font-semibold">
        {Icon && <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />}
        {title}
      </h2>
      {children}
    </section>
  )
}
