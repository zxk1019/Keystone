/**
 * A file the core reads and writes, whatever the device: a file in %APPDATA% on the PC
 * (main/data/nodeTextFile.ts) or in the app's private folder on the phone.
 */
export interface TextFile {
  /** The content, or null if the file does not exist yet */
  read(): Promise<string | null>
  /** Replaces the whole content in one go: a crash never leaves it half-written */
  write(text: string): Promise<void>
  /** Keeps a copy of the current content next to it, e.g. "<name>.v1.json" for ".v1" */
  copyAside(suffix: string): Promise<void>
}
