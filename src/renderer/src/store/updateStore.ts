import { create } from 'zustand'
import type { UpdateStatus } from '@shared/updates'
import { platform } from '../platform'

interface UpdateStoreState {
  /** Mirror of the update check (in the main process on the PC); null until loaded */
  status: UpdateStatus | null
  /** The installed version, e.g. "1.5.0" */
  version: string | null
  /** The version whose banner was closed; it shows again for a later one or after a restart */
  dismissed: string | null
  load: () => Promise<void>
  check: () => Promise<void>
  install: () => Promise<void>
  dismiss: (version: string) => void
}

export const useUpdateStore = create<UpdateStoreState>((set) => ({
  status: null,
  version: null,
  dismissed: null,
  load: async () => {
    const [status, info] = await Promise.all([platform.getUpdateStatus(), platform.getAppInfo()])
    set({ status, version: info.version })
  },
  check: async () => set({ status: await platform.checkForUpdates() }),
  install: () => platform.installUpdate(),
  dismiss: (version) => set({ dismissed: version })
}))
