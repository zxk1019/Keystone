import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translations } from '@shared/locales'
import { DEFAULT_SETTINGS } from '@shared/types'

const resources = Object.fromEntries(
  Object.entries(translations).map(([language, tree]) => [language, { translation: tree }])
)

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_SETTINGS.language,
  fallbackLng: DEFAULT_SETTINGS.language,
  // React already escapes the text it renders
  interpolation: { escapeValue: false },
  // In development, a missing translation shows up in the console (F12)
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (_languages, _namespace, key) =>
    console.warn(`[i18n] Falta la traducción: ${key}`)
})

export default i18n
