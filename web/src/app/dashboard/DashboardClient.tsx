'use client'

import React from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Grid,
  Card,
  CardContent,
  Chip,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/useRealtime'
import { useT } from '@/i18n/I18nContext'
import type { Locale } from '@/i18n/types'
import { SUPPORTED_LOCALES } from '@/i18n/types'

export default function DashboardClient() {
  const router = useRouter()
  const { connected, lastEvent } = useRealtime()
  const { t, locale, setLocale } = useT()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function handleLocaleChange(_: React.MouseEvent<HTMLElement>, value: Locale | null) {
    if (value) setLocale(value)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flexGrow: 1 }}>
            🥗 {t.common.appName}
          </Typography>

          {/* Language switcher */}
          <ToggleButtonGroup
            value={locale}
            exclusive
            onChange={handleLocaleChange}
            size="small"
            sx={{ mr: 2 }}
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <ToggleButton key={loc} value={loc} sx={{ px: 1.5, py: 0.25, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                {loc}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Tooltip title={connected ? t.nav.realtimeConnected : t.nav.realtimeDisconnected}>
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {connected ? (
                <WifiIcon fontSize="small" color="success" />
              ) : (
                <WifiOffIcon fontSize="small" color="error" />
              )}
              <Typography variant="caption" color={connected ? 'success.main' : 'error.main'}>
                {connected ? t.nav.live : t.nav.offline}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title={t.nav.logout}>
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.dashboard.welcome}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t.dashboard.subtitle}
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t.dashboard.weeklyMealPlan.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t.dashboard.weeklyMealPlan.description}
                </Typography>
                <Chip label={t.dashboard.comingSoon} size="small" color="primary" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t.dashboard.groceryList.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t.dashboard.groceryList.description}
                </Typography>
                <Chip label={t.dashboard.comingSoon} size="small" color="secondary" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t.dashboard.realtimeStatus.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t.dashboard.realtimeStatus.description}
                </Typography>
                <Chip
                  label={connected ? t.dashboard.connected : t.dashboard.disconnected}
                  size="small"
                  color={connected ? 'success' : 'error'}
                />
                {lastEvent && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {t.dashboard.lastEvent}: {lastEvent}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
