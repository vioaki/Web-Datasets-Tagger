import { create } from 'zustand'
import { setTranslationLocale } from './translate'
export { t } from './translate'
export type Locale = 'zh-CN' | 'en'
function initialLocale(): Locale {
  try { return localStorage.getItem('tagger-language') === 'en' ? 'en' : 'zh-CN' } catch { return 'zh-CN' }
}
export const useLocale = create<{ locale: Locale; setLocale: (locale: Locale) => void }>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => {
    setTranslationLocale(locale)
    set({ locale })
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    try { localStorage.setItem('tagger-language', locale) } catch { /* Session-only when storage is unavailable. */ }
  },
}))
if (typeof document !== 'undefined') document.documentElement.lang = useLocale.getState().locale
