import type { Language } from '../types'
import es from './es.json'
import en from './en.json'
import zhCN from './zh-CN.json'

export type TranslationTree = typeof es

// Typed against the Spanish file, so a key missing in another language fails the typecheck
export const translations: Record<Language, TranslationTree> = {
  es,
  en,
  'zh-CN': zhCN
}
