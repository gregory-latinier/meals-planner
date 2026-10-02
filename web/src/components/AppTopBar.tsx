'use client'

import React from 'react'
import { AppBar, Box, IconButton, ToggleButton, ToggleButtonGroup, Toolbar, Tooltip, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/useRealtime'
import { useT } from '@/i18n/I18nContext'
import { SUPPORTED_LOCALES } from '@/i18n/types'
import type { Locale } from '@/i18n/types'

export default function AppTopBar() {
  const router = useRouter()
  const { connected } = useRealtime()
  const { t, locale, setLocale } = useT()

  function handleLocaleChange(_: React.MouseEvent<HTMLElement>, value: Locale | null) {
    if (value) setLocale(value)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <AppBar position="sticky" color="inherit">
      <Toolbar>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flexGrow: 1 }}>
          🥗 {t.common.appName}
        </Typography>

        <ToggleButtonGroup
          value={locale}
          exclusive
          onChange={handleLocaleChange}
          size="small"
          sx={{ mr: 2 }}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <ToggleButton
              key={loc}
              value={loc}
              sx={{ px: 1.5, py: 0.25, textTransform: 'uppercase', fontSize: '0.75rem' }}
            >
              {loc}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Tooltip title={connected ? t.nav.realtimeConnected : t.nav.realtimeDisconnected}>
          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {connected ? <WifiIcon fontSize="small" color="success" /> : <WifiOffIcon fontSize="small" color="error" />}
            <Typography variant="caption" color={connected ? 'success.main' : 'error.main'}>
              {connected ? t.nav.live : t.nav.offline}
            </Typography>
          </Box>
        </Tooltip>

        <Tooltip title={t.nav.settings}>
          <IconButton onClick={() => router.push('/settings')} color="inherit" aria-label={t.nav.settings}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t.nav.logout}>
          <IconButton onClick={handleLogout} color="inherit" aria-label={t.nav.logout}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
