import { create } from 'zustand'
import type { TimerCommand, TimerState } from '@shared/studyTimer'
import { platform } from '../platform'

interface StudyState {
  /** Mirror of the timer in the main process; null until loaded */
  timer: TimerState | null
  load: () => Promise<void>
  command: (command: TimerCommand) => Promise<void>
}

export const useStudyStore = create<StudyState>((set) => ({
  timer: null,
  load: async () => set({ timer: await platform.getStudyState() }),
  command: async (command) => set({ timer: await platform.studyCommand(command) })
}))
