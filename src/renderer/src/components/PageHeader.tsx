import type { JSX } from 'react'

export default function PageHeader({ title }: { title: string }): JSX.Element {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
}
