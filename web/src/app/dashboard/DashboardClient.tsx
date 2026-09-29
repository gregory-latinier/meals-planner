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
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/useRealtime'

export default function DashboardClient() {
  const router = useRouter()
  const { connected, lastEvent } = useRealtime()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flexGrow: 1 }}>
            🥗 Meals Planner
          </Typography>

          <Tooltip title={connected ? 'Realtime: connected' : 'Realtime: disconnected'}>
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {connected ? (
                <WifiIcon fontSize="small" color="success" />
              ) : (
                <WifiOffIcon fontSize="small" color="error" />
              )}
              <Typography variant="caption" color={connected ? 'success.main' : 'error.main'}>
                {connected ? 'Live' : 'Offline'}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Your household meal planning dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Weekly Meal Plan</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Plan your meals for the week ahead.
                </Typography>
                <Chip label="Coming soon" size="small" color="primary" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Grocery List</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Auto-generate your shopping list from your meal plan.
                </Typography>
                <Chip label="Coming soon" size="small" color="secondary" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Realtime Status</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Live sync across all household devices.
                </Typography>
                <Chip
                  label={connected ? 'Connected' : 'Disconnected'}
                  size="small"
                  color={connected ? 'success' : 'error'}
                />
                {lastEvent && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Last event: {lastEvent}
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
