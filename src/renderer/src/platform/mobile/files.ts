import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { TextFile } from '@core/data/textFile'

/** A file in the app's private folder on the phone (see core/data/textFile.ts). */
export function appFile(name: string): TextFile {
  const directory = Directory.Data
  const exists = async (path: string): Promise<boolean> => {
    try {
      await Filesystem.stat({ path, directory })
      return true
    } catch {
      return false
    }
  }
  const asideName = (suffix: string): string => name.replace(/\.json$/, `${suffix}.json`)

  const temp = `${name}.tmp`
  const readText = async (path: string): Promise<string> => {
    const { data } = await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 })
    return typeof data === 'string' ? data : await data.text()
  }

  return {
    read: async () => {
      if (await exists(name)) return readText(name)
      // A save that stopped between its two steps left the content only in the temporary file
      if (await exists(temp)) return readText(temp)
      return null
    },
    write: async (text) => {
      // The temporary file first, so a crash halfway never leaves a half-written file
      await Filesystem.writeFile({ path: temp, data: text, directory, encoding: Encoding.UTF8 })
      if (await exists(name)) await Filesystem.deleteFile({ path: name, directory })
      await Filesystem.rename({ from: temp, to: name, directory, toDirectory: directory })
    },
    copyAside: async (suffix) => {
      if (!(await exists(name)) || (await exists(asideName(suffix)))) return
      await Filesystem.copy({
        from: name,
        to: asideName(suffix),
        directory,
        toDirectory: directory
      })
    }
  }
}
