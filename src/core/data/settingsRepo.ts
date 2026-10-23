import type { Settings } from '@shared/types'
import { isRecord, sanitizeSettings } from '@shared/validation'
import type { DataStore } from './dataStore'

export class SettingsRepo {
  constructor(private readonly store: DataStore) {}

  get(): Settings {
    return this.store.get().settings
  }

  /** `patch` comes from the renderer, so invalid values are ignored and the current ones kept. */
  update(patch: unknown): Settings {
    return this.store.update((data) => ({
      ...data,
      settings: sanitizeSettings(
        { ...data.settings, ...(isRecord(patch) ? patch : {}) },
        data.settings
      )
    })).settings
  }
}
