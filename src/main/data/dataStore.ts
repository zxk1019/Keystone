import { copyFileSync, existsSync, readFileSync, renameSync } from 'fs'
import { markAllPending, trackChanges } from '@shared/sync'
import { createDefaultData, type AppData } from '@shared/types'
import { isRecord, parseAppData } from '@shared/validation'
import { writeJsonAtomic } from './jsonFile'

/** Keeps all the app data in memory and saves it to a single JSON file. */
export class DataStore {
  private data: AppData
  private readonly listeners = new Set<() => void>()

  constructor(private readonly filePath: string) {
    this.data = this.load()
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

  private load(): AppData {
    if (!existsSync(this.filePath)) return createDefaultData()

    try {
      const raw: unknown = JSON.parse(readFileSync(this.filePath, 'utf-8'))
      const data = parseAppData(raw)
      if (data && isRecord(raw) && raw.version === 1) return this.upgradeFromVersion1(data)
      if (data) return data
    } catch {
      // Unreadable JSON: handled below like any other invalid file
    }

    // Keep the broken file next to the new one instead of overwriting it, so nothing is lost
    renameSync(this.filePath, this.filePath.replace(/\.json$/, `.corrupt-${Date.now()}.json`))
    return createDefaultData()
  }

  /**
   * Data from before sync existed: all of it is new to the cloud. The old file is kept as it
   * was, just in case, before it is overwritten.
   */
  private upgradeFromVersion1(data: AppData): AppData {
    const copyPath = this.filePath.replace(/\.json$/, '.v1.json')
    if (!existsSync(copyPath)) copyFileSync(this.filePath, copyPath)
    const upgraded = { ...data, sync: markAllPending(data, Date.now()) }
    writeJsonAtomic(this.filePath, upgraded)
    return upgraded
  }

  private save(): void {
    writeJsonAtomic(this.filePath, this.data)
  }
}
