import { markAllPending, trackChanges, withCursor } from '@shared/sync'
import { createDefaultData, type AppData } from '@shared/types'
import { isRecord, parseAppData } from '@shared/validation'
import type { TextFile } from './textFile'

/** Keeps all the app data in memory and saves it to a single JSON file. */
export class DataStore {
  private readonly listeners = new Set<() => void>()
  /** Saves go one after another, in the order the changes happened */
  private saving: Promise<void> = Promise.resolve()
  /** A save is waiting for the one in progress to finish */
  private saveWaiting = false

  private constructor(
    private readonly file: TextFile,
    private data: AppData
  ) {}

  /** Reads the data file, or starts with empty data. */
  static async open(file: TextFile): Promise<DataStore> {
    const text = await file.read()
    if (text === null) return new DataStore(file, createDefaultData())

    let raw: unknown = null
    try {
      raw = JSON.parse(text)
    } catch {
      // Unreadable JSON: handled below like any other invalid file
    }
    const data = parseAppData(raw)
    if (!data) {
      // Keep the broken file next to the new one instead of losing it
      await file.copyAside(`.corrupt-${Date.now()}`)
      const store = new DataStore(file, createDefaultData())
      store.save()
      return store
    }
    if (isRecord(raw) && raw.version === 1) {
      // Data from before sync existed: all of it is new to the cloud. The old file is kept
      // as it was, just in case, before it is overwritten.
      await file.copyAside('.v1')
      const store = new DataStore(file, { ...data, sync: markAllPending(data, Date.now()) })
      store.save()
      return store
    }
    if (isRecord(raw) && raw.version === 2) {
      // Data from before habits. While this device had the old version it skipped the habits
      // made on the other device, so the next sync downloads everything again to get them.
      await file.copyAside('.v2')
      const store = new DataStore(file, { ...data, sync: withCursor(data.sync, '') })
      store.save()
      return store
    }
    return new DataStore(file, data)
  }

  get(): AppData {
    return this.data
  }

  /** A change made on this device: what it changes is also recorded for the sync. */
  update(change: (data: AppData) => AppData): AppData {
    const before = this.data
    const after = change(before)
    const sync = trackChanges(before, after, Date.now())
    this.data = { ...after, sync }
    this.save()
    if (sync.pending !== before.sync.pending) this.listeners.forEach((listener) => listener())
    return this.data
  }

  /** Data the sync has already merged, with its bookkeeping up to date. */
  replaceFromSync(data: AppData): void {
    this.data = data
    this.save()
  }

  /** Called after every change made on this device that the cloud does not have yet. */
  onLocalChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Resolves when everything changed so far is on disk. */
  saved(): Promise<void> {
    return this.saving
  }

  /**
   * Writes the data after the save in progress. Many changes in a row share one write: the
   * one waiting takes the data as it is when its turn comes. On the phone each write is slow,
   * and a long queue would leave the file far behind if Android closed the app.
   */
  private save(): void {
    if (this.saveWaiting) return
    this.saveWaiting = true
    this.saving = this.saving
      .then(() => {
        this.saveWaiting = false
        return this.file.write(JSON.stringify(this.data, null, 2))
      })
      .catch((error: unknown) => console.error('[data] No se han podido guardar los datos', error))
  }
}
