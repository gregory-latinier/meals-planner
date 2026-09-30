'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Locale, Messages } from './types'
import {
  getMessages,
  detectLocale,
  readStoredLocale,
  writeStoredLocale,
  DEFAULT_LOCALE,
} from './index'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Messages
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: getMessages(DEFAULT_LOCALE),
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const nextLocale = readStoredLocale() ?? detectLocale()

    if (nextLocale !== DEFAULT_LOCALE) {
      // Defer update to avoid hydration mismatch and satisfy hook lint rules.
      queueMicrotask(() => setLocaleState(nextLocale))
    }
  }, [])

  function setLocale(next: Locale) {
    setLocaleState(next)
    writeStoredLocale(next)
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: getMessages(locale) }}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * Returns the current locale, a setLocale function, and the full typed
 * translation dictionary as `t`.
 *
 * @example
 * const { t, locale, setLocale } = useT()
 * return <Button>{t.auth.login.submitButton}</Button>
 */
export function useT(): I18nContextValue {
  return useContext(I18nContext)
}
