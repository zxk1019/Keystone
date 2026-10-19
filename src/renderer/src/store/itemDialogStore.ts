import { create } from 'zustand'
import { toDateKey } from '@shared/dates'
import type { AgendaItem, Draft } from '@shared/types'

interface ItemDialogState {
  /** What the dialog is editing, or null when it is closed */
  draft: Draft<AgendaItem> | null
  /**
   * Changes every time the dialog opens. Used as a React key, so each opening gets a fresh form
   * even if the previous one has not finished closing yet.
   */
  session: number
  /** Opens the dialog for a new item, e.g. with the date or subject already chosen. */
  openNew: (values?: Partial<Draft<AgendaItem>>) => void
  openEdit: (item: AgendaItem) => void
  close: () => void
}

// One dialog for the whole app, so Today, Tasks and the Agenda can all open it
export const useItemDialogStore = create<ItemDialogState>((set) => ({
  draft: null,
  session: 0,
  openNew: (values = {}) =>
    set((state) => ({
      session: state.session + 1,
      draft: {
        type: 'homework',
        title: '',
        date: toDateKey(new Date()),
        priority: 'medium',
        done: false,
        ...values
      }
    })),
  openEdit: (item) => set((state) => ({ session: state.session + 1, draft: item })),
  close: () => set({ draft: null })
}))
