import {
  DATA_VERSION,
  DEFAULT_SETTINGS,
  LANGUAGES,
  THEMES,
  type AppData,
  type Settings
} from './types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Keeps only valid values; anything missing or wrong falls back to `fallback`. */
export function sanitizeSettings(value: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const input = isRecord(value) ? value : {}
  const theme = THEMES.find((option) => option === input.theme) ?? fallback.theme
  const language = LANGUAGES.find(({ code }) => code === input.language)?.code ?? fallback.language
  return { theme, language }
}

/** Returns the data if it looks like a Mi Estudio data file, or null if it does not. */
export function parseAppData(value: unknown): AppData | null {
  if (!isRecord(value) || value.version !== DATA_VERSION) return null
  const { subjects, schedule, items } = value
  if (!Array.isArray(subjects) || !Array.isArray(schedule) || !Array.isArray(items)) return null
  return {
    version: DATA_VERSION,
    settings: sanitizeSettings(value.settings),
    subjects,
    schedule,
    items
  }
}
