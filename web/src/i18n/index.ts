import type { Locale, Messages } from './types'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './types'
import en from './messages/en'
import fr from './messages/fr'

const messages: Record<Locale, Messages> = { en, fr }

/** Returns the Messages dictionary for the given locale. */
export function getMessages(locale: Locale): Messages {
  return messages[locale]
}

/**
 * Detects the preferred locale from the browser's navigator.language.
 * Falls back to DEFAULT_LOCALE if the browser locale is not supported.
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const lang = navigator.language.slice(0, 2).toLowerCase() as Locale
  return SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE
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
