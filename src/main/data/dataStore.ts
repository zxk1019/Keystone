import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { createDefaultData, type AppData } from '@shared/types'
import { parseAppData } from '@shared/validation'

/** Keeps all the app data in memory and saves it to a single JSON file. */
export class DataStore {
  private data: AppData

  constructor(private readonly filePath: string) {
    this.data = this.load()
  }

  get(): AppData {
    return this.data
  }

  update(change: (data: AppData) => AppData): AppData {
    this.data = change(this.data)
    this.save()
    return this.data
  }

  private load(): AppData {
    if (!existsSync(this.filePath)) return createDefaultData()

    try {
      const data = parseAppData(JSON.parse(readFileSync(this.filePath, 'utf-8')))
      if (data) return data
    } catch {
      // Unreadable JSON: handled below like any other invalid file
    }

    // Keep the broken file next to the new one instead of overwriting it, so nothing is lost
    renameSync(this.filePath, this.filePath.replace(/\.json$/, `.corrupt-${Date.now()}.json`))
    return createDefaultData()
  }

  private save(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    // Write to a temporary file first so a crash halfway never leaves a half-written data file
    const tempPath = `${this.filePath}.tmp`
    writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8')
    renameSync(tempPath, this.filePath)
  }
}
