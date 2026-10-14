import React from 'react'
import { AppBar, Box, Button, IconButton, Toolbar, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/I18nContext'

export default function AppTopBar() {
  const navigate = useNavigate()
  const { t } = useT()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    navigate('/login')
  }

  return (
    <AppBar position="sticky" color="inherit">
      <Toolbar>
        <Typography
          variant="h6"
          color="primary"
          sx={{ fontWeight: 700, flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          🥗 {t.common.appName}
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
          <Button color="inherit" onClick={() => navigate('/recipes')}>
            {t.nav.recipesTab}
          </Button>
          <Button color="inherit" onClick={() => navigate('/meal-plan')}>
            {t.nav.mealPlanTab}
          </Button>
        </Box>

        <IconButton color="inherit" onClick={() => navigate('/settings')} sx={{ mr: 1 }}>
          <SettingsIcon />
        </IconButton>

        <IconButton color="inherit" onClick={handleLogout} title={t.nav.logout}>
          <LogoutIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
