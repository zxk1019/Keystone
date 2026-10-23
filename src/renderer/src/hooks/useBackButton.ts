import { useEffect } from 'react'
import { platform } from '../platform'
import { useNavigationStore } from '../store/navigationStore'

/**
 * Android's back button: closes the open dialog, otherwise goes back to Today. On Today the
 * platform puts the app in the background, as other apps do.
 */
export function useBackButton(): void {
  useEffect(
    () =>
      platform.onBackButton(() => {
        const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
        if (dialog) {
          dialog.close()
          return true
        }
        const navigation = useNavigationStore.getState()
        if (navigation.section !== 'today' || navigation.editingSchedule) {
          navigation.goTo('today')
          return true
        }
        return false
      }),
    []
  )
}
