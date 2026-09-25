import { en } from './messages'
let locale = 'zh-CN'
try { locale = localStorage.getItem('tagger-language') || locale } catch { /* Workers have no localStorage. */ }
export const setTranslationLocale = (next: string) => { locale = next }
export const getTranslationLocale = () => locale
export function t(message: string, values: Record<string, string | number> = {}): string {
  const translated = locale === 'en' ? en[message] ?? message : message
  return translated.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match))
}
