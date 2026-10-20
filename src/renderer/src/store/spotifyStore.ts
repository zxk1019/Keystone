import { create } from 'zustand'
import type { SpotifyError, SpotifyStatus } from '@shared/spotify'
import { platform } from '../platform'

interface SpotifyStoreState {
  /** Mirror of the connection in the main process; null until loaded */
  status: SpotifyStatus | null
  /** The browser login is open */
  connecting: boolean
  /** Why the last connection attempt failed */
  error: SpotifyError | null
  load: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export const useSpotifyStore = create<SpotifyStoreState>((set) => ({
  status: null,
  connecting: false,
  error: null,
  load: async () => set({ status: await platform.getSpotifyStatus() }),
  connect: async () => {
    set({ connecting: true, error: null })
    const result = await platform.spotifyConnect()
    set(
      result.ok
        ? { connecting: false, status: result.value }
        : { connecting: false, error: result.error }
    )
  },
  disconnect: async () => {
    await platform.spotifyDisconnect()
    set({ error: null })
  }
}))
