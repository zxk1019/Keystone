import { translations } from '@shared/locales'
import { isRecord } from '@shared/validation'
import type { Language } from '@shared/types'

export type Translate = (key: string, vars?: Record<string, string>) => string

/** Small translator for the texts the main process shows (tray menu, dialogs, notifications). */
export function createTranslator(language: Language): Translate {
  return (key, vars) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (node, part) => (isRecord(node) ? node[part] : undefined),
        translations[language]
      )
    const text = typeof value === 'string' ? value : key
    return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => vars?.[name] ?? '')
  }
}
