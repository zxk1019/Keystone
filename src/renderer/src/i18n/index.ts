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
  interpolation: { escapeValue: false }
})

export default i18n
