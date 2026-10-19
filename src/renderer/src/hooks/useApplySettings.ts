import { useEffect } from 'react'
import type { Settings } from '@shared/types'
import i18n from '../i18n'

const darkQuery = '(prefers-color-scheme: dark)'

/** Applies the theme and language to the page whenever they change. */
export function useApplySettings(settings: Settings | null): void {
  const theme = settings?.theme
  const language = settings?.language

  useEffect(() => {
    if (!language) return
    i18n.changeLanguage(language)
    // Lets the browser pick the right fonts, e.g. for Chinese characters
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (!theme) return
    const media = window.matchMedia(darkQuery)
    const apply = (): void => {
      const effective = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = effective
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
