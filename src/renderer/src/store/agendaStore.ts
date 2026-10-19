import { create } from 'zustand'
import type { SaveSlotResult } from '@shared/api'
import type { AgendaData, Draft, ScheduleSlot, Subject } from '@shared/types'
import { platform } from '../platform'

interface AgendaState {
  /** null until the data has been loaded */
  agenda: AgendaData | null
  load: () => Promise<void>
  saveSubject: (subject: Draft<Subject>) => Promise<void>
  deleteSubject: (id: string) => Promise<void>
  /** Resolves with 'overlap' (and saves nothing) if the slot clashes with another one. */
  saveSlot: (slot: Draft<ScheduleSlot>) => Promise<SaveSlotResult>
  deleteSlot: (id: string) => Promise<void>
}

export const useAgendaStore = create<AgendaState>((set) => ({
  agenda: null,
  load: async () => set({ agenda: await platform.getAgenda() }),
  saveSubject: async (subject) => set({ agenda: await platform.saveSubject(subject) }),
  deleteSubject: async (id) => set({ agenda: await platform.deleteSubject(id) }),
  saveSlot: async (slot) => {
    const result = await platform.saveScheduleSlot(slot)
    if (result.status === 'saved') set({ agenda: result.agenda })
    return result
  },
  deleteSlot: async (id) => set({ agenda: await platform.deleteScheduleSlot(id) })
}))
