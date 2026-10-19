import { mkdirSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'

/** Writes to a temporary file first so a crash halfway never leaves a half-written file. */
export function writeJsonAtomic(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp`
  writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tempPath, filePath)
}
