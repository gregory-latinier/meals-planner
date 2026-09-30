'use client'

import React from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { theme } from '@/theme/theme'
import { I18nProvider } from '@/i18n/I18nContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
