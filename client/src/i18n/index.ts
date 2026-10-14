import type { Locale, Messages } from './types'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './types'
import en from './messages/en'
import fr from './messages/fr'

const messages: Record<Locale, Messages> = { en, fr }

/** Returns the Messages dictionary for the given locale. */
export function getMessages(locale: Locale): Messages {
  return messages[locale]
}

const STORAGE_KEY = 'mp_locale'

/** Reads the persisted locale from localStorage. */
export function readStoredLocale(): Locale | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale
  }
  return null
}

/** Persists the selected locale to localStorage. */
export function writeStoredLocale(locale: Locale): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE }
export type { Locale, Messages }
