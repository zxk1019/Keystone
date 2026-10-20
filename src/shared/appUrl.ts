import type { NavigationTarget } from './api'

/**
 * miestudio:// links. Windows opens them with the installed app: they are how the buttons
 * of a notification reach the app ("Done" marks a task, a click opens a screen).
 */
export const APP_PROTOCOL = 'miestudio'

export type AppUrlAction =
  { action: 'done'; itemId: string } | { action: 'open'; target: NavigationTarget }

const SECTIONS: NavigationTarget['section'][] = ['today', 'tasks', 'agenda', 'study']
const ITEM_ID = /^[A-Za-z0-9-]{1,64}$/

export function buildAppUrl(action: AppUrlAction): string {
  if (action.action === 'done') {
    return `${APP_PROTOCOL}://done?${new URLSearchParams({ item: action.itemId })}`
  }
  const { section, itemId, tasksStatus } = action.target
  const params = new URLSearchParams({ section })
  if (itemId) params.set('item', itemId)
  if (tasksStatus) params.set('status', tasksStatus)
  return `${APP_PROTOCOL}://open?${params}`
}

/** Reads a link received from Windows; anything unexpected is ignored (null). */
export function parseAppUrl(text: string): AppUrlAction | null {
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== `${APP_PROTOCOL}:`) return null
  const item = url.searchParams.get('item')
  const validItem = item !== null && ITEM_ID.test(item)

  if (url.hostname === 'done') return validItem ? { action: 'done', itemId: item } : null
  if (url.hostname === 'open') {
    const section = SECTIONS.find((option) => option === url.searchParams.get('section'))
    if (!section) return null
    const target: NavigationTarget = { section }
    if (validItem) target.itemId = item
    if (url.searchParams.get('status') === 'overdue') target.tasksStatus = 'overdue'
    return { action: 'open', target }
  }
  return null
}

/** Windows passes the link as one of the arguments when it starts the app. */
export function findAppUrl(argv: string[]): string | undefined {
  return argv.find((argument) => argument.startsWith(`${APP_PROTOCOL}://`))
}
