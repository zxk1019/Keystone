import { compareItems, dueGroup, type DueGroup } from '@shared/items'
import type { AgendaItem } from '@shared/types'

export type StatusFilter = 'pending' | 'overdue' | 'done' | 'all'
export type SectionKey = DueGroup | 'done'

export interface TaskSection {
  key: SectionKey
  items: AgendaItem[]
}

const PENDING_ORDER: DueGroup[] = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later']

/** Most recent first, for lists that look back in time */
function newestFirst(a: AgendaItem, b: AgendaItem): number {
  return -compareItems(a, b)
}

/** Splits the items into the headed groups the Tasks screen shows, dropping empty ones. */
export function buildSections(
  items: AgendaItem[],
  status: StatusFilter,
  today: Date
): TaskSection[] {
  const pending = items.filter((item) => !item.done)
  const done = items.filter((item) => item.done).sort(newestFirst)
  const inGroup = (group: DueGroup): AgendaItem[] =>
    pending.filter((item) => dueGroup(item, today) === group).sort(compareItems)

  const sections: TaskSection[] = []
  if (status === 'pending' || status === 'all') {
    for (const key of PENDING_ORDER) sections.push({ key, items: inGroup(key) })
  }
  if (status === 'overdue') sections.push({ key: 'overdue', items: inGroup('overdue') })
  if (status === 'all') sections.push({ key: 'past', items: inGroup('past').sort(newestFirst) })
  if (status === 'done' || status === 'all') sections.push({ key: 'done', items: done })

  return sections.filter((section) => section.items.length > 0)
}
