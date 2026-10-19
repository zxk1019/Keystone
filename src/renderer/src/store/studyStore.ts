import { create } from 'zustand'
import type { TimerCommand, TimerState } from '@shared/studyTimer'
import { platform } from '../platform'

/** Number of tips in the locale files (study.tips) */
export const TIP_COUNT = 20

function randomTip(except: number): number {
  const next = Math.floor(Math.random() * (TIP_COUNT - 1))
  // Skips the current one so "another tip" always changes
  return next >= except ? next + 1 : next
}

interface StudyState {
  /** Mirror of the timer in the main process; null until loaded */
  timer: TimerState | null
  tipIndex: number
  load: () => Promise<void>
  command: (command: TimerCommand) => Promise<void>
  nextTip: () => void
}

export const useStudyStore = create<StudyState>((set, get) => ({
  timer: null,
  tipIndex: Math.floor(Math.random() * TIP_COUNT),
  load: async () => set({ timer: await platform.getStudyState() }),
  command: async (command) => set({ timer: await platform.studyCommand(command) }),
  nextTip: () => set({ tipIndex: randomTip(get().tipIndex) })
}))
