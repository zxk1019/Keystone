import { create } from 'zustand'
import type { SyncError } from '@shared/firebase'
import type { SyncStatus } from '@shared/sync'
import { platform } from '../platform'

interface SyncStoreState {
  /** Mirror of the sync in the main process; null until loaded */
  status: SyncStatus | null
  /** Signing in, creating the account or asking for a new password */
  busy: boolean
  /** Why the last of those failed */
  error: SyncError | null
  /** The password reset email is on its way */
  resetSent: boolean
  load: () => Promise<void>
  /** Resolves true when signed in */
  signIn: (email: string, password: string, create: boolean) => Promise<boolean>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  syncNow: () => Promise<void>
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  status: null,
  busy: false,
  error: null,
  resetSent: false,
  load: async () => set({ status: await platform.getSyncStatus() }),
  signIn: async (email, password, create) => {
    set({ busy: true, error: null, resetSent: false })
    const result = await platform.syncSignIn(email, password, create)
    set(result.ok ? { busy: false, status: result.value } : { busy: false, error: result.error })
    return result.ok
  },
  signOut: async () => {
    await platform.syncSignOut()
    set({ error: null, resetSent: false })
  },
  resetPassword: async (email) => {
    set({ busy: true, error: null, resetSent: false })
    const result = await platform.syncResetPassword(email)
    set(result.ok ? { busy: false, resetSent: true } : { busy: false, error: result.error })
  },
  syncNow: async () => set({ status: await platform.syncNow() })
}))
