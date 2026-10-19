import { create } from 'zustand'
import type { EyeBreakCommand } from '@shared/api'
import type { EyeBreakStatus } from '@shared/eyeBreak'
import { platform } from '../platform'

interface EyeBreakStoreState {
  /** Mirror of the 20-20-20 counter in the main process; null until loaded */
  status: EyeBreakStatus | null
  load: () => Promise<void>
  command: (command: EyeBreakCommand) => Promise<void>
}

export const useEyeBreakStore = create<EyeBreakStoreState>((set) => ({
  status: null,
  load: async () => set({ status: await platform.getEyeBreakStatus() }),
  command: async (command) => set({ status: await platform.eyeBreakCommand(command) })
}))
