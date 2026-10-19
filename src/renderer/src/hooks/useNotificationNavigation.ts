import { useEffect } from 'react'
import type { AgendaItem } from '@shared/types'
import { platform } from '../platform'
import { useAgendaStore } from '../store/agendaStore'
import { useItemDialogStore } from '../store/itemDialogStore'
import { useNavigationStore } from '../store/navigationStore'

/** Takes the user where a clicked notification points: a screen, a filter or an item. */
async function followNavigation(): Promise<void> {
  const target = await platform.takeNavigation()
  if (!target) return

  const navigation = useNavigationStore.getState()
  navigation.goTo(target.section)
  if (target.tasksStatus) navigation.setTasksStatus(target.tasksStatus)

  if (target.itemId) {
    const findItem = (): AgendaItem | undefined =>
      useAgendaStore.getState().agenda?.items.find((item) => item.id === target.itemId)
    // The item may be newer than what this window has loaded, so reload once if it is missing
    if (!findItem()) await useAgendaStore.getState().load()
    const item = findItem()
    if (item) useItemDialogStore.getState().openEdit(item)
  }
}

export function useNotificationNavigation(): void {
  useEffect(() => {
    // A notification clicked while the window did not exist yet is waiting to be picked up
    followNavigation()
    return platform.onNavigate(() => followNavigation())
  }, [])
}
