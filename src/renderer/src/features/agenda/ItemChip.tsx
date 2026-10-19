import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgendaItem, Subject } from '@shared/types'
import { TYPE_ICONS } from '../../lib/itemStyles'
import { styleFor } from './subjectStyles'

/** A small label for a homework, exam, project or event, in the color of its subject. */
export default function ItemChip({
  item,
  subject,
  onClick
}: {
  item: AgendaItem
  subject?: Subject
  onClick?: (item: AgendaItem) => void
}): JSX.Element {
  const { t } = useTranslation()
  const Icon = TYPE_ICONS[item.type]
  const typeName = t(`agenda.itemType.${item.type}`)
  const className = `relative z-10 flex w-full items-center gap-1 rounded border-l-2 px-1.5 py-0.5 text-left text-xs ${styleFor(subject).block} ${
    item.done ? 'line-through opacity-50' : ''
  }`
  const content = (
    <>
      <Icon className="size-3 shrink-0" aria-label={typeName} />
      <span className="truncate">{item.title}</span>
    </>
  )

  return onClick ? (
    <button
      type="button"
      title={`${typeName}: ${item.title}`}
      onClick={() => onClick(item)}
      className={`${className} hover:brightness-95 dark:hover:brightness-125`}
    >
      {content}
    </button>
  ) : (
    <div title={`${typeName}: ${item.title}`} className={className}>
      {content}
    </div>
  )
}
