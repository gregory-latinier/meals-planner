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
import { useNavigate } from 'react-router-dom'
import { useRealtime } from '@/hooks/useRealtime'
import { useT } from '@/i18n/I18nContext'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { connected, lastEvent } = useRealtime()
  const { t } = useT()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    navigate('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flexGrow: 1 }}>
            🥗 {t.common.appName}
          </Typography>

          <Tooltip title={t.nav.logout}>
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: { xs: 1, md: 2 }, pb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.dashboard.welcome}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t.dashboard.subtitle}
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              elevation={0}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
              onClick={() => navigate('/meal-plan')}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t.dashboard.weeklyMealPlan.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t.dashboard.weeklyMealPlan.description}
                </Typography>
                <Chip label={t.mealPlan.title} size="small" color="primary" clickable />
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
