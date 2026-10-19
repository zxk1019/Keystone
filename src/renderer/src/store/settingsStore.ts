import { create } from 'zustand'
import type { Settings } from '@shared/types'
import { platform } from '../platform'

interface SettingsState {
  /** null until the settings have been loaded */
  settings: Settings | null
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  load: async () => set({ settings: await platform.getSettings() }),
  update: async (patch) => set({ settings: await platform.updateSettings(patch) })
}))
