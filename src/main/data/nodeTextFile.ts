import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { TextFile } from '@core/data/textFile'

/** A file on the PC disk, for the core (see core/data/textFile.ts). */
export function nodeTextFile(filePath: string): TextFile {
  return {
    read: async () => (existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null),
    write: async (text) => {
      // A temporary file first, so a crash halfway never leaves a half-written file
      mkdirSync(dirname(filePath), { recursive: true })
      const tempPath = `${filePath}.tmp`
      writeFileSync(tempPath, text, 'utf-8')
      renameSync(tempPath, filePath)
    },
    copyAside: async (suffix) => {
      const copyPath = filePath.replace(/\.json$/, `${suffix}.json`)
      if (existsSync(filePath) && !existsSync(copyPath)) copyFileSync(filePath, copyPath)
    }
  }
}
