import { create } from 'zustand'
import type { HabitDraft, HabitMarkStatus, HabitsData } from '@shared/types'
import { platform } from '../platform'

interface HabitsState {
  /** null until the data has been loaded */
  data: HabitsData | null
  load: () => Promise<void>
  save: (habit: HabitDraft) => Promise<void>
  /** Also deletes its marks */
  remove: (id: string) => Promise<void>
  /** null takes the mark away */
  setMark: (habitId: string, date: string, status: HabitMarkStatus | null) => Promise<void>
}

export const useHabitsStore = create<HabitsState>((set) => ({
  data: null,
  load: async () => set({ data: await platform.getHabits() }),
  save: async (habit) => set({ data: await platform.saveHabit(habit) }),
  remove: async (id) => set({ data: await platform.deleteHabit(id) }),
  setMark: async (habitId, date, status) =>
    set({ data: await platform.setHabitMark(habitId, date, status) })
}))
