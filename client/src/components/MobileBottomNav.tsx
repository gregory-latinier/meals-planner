import React from 'react'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/I18nContext'

export type MobileBottomNavValue = 'recipes' | 'meal-plan'

interface MobileBottomNavProps {
  value: MobileBottomNavValue | null
}

export default function MobileBottomNav({ value }: MobileBottomNavProps) {
  const navigate = useNavigate()
  const { t } = useT()

  function handleChange(_: React.SyntheticEvent, nextValue: MobileBottomNavValue) {
    if (nextValue === value) return
    if (nextValue === 'recipes') {
      navigate('/recipes')
      return
    }
    if (nextValue === 'meal-plan') {
      navigate('/meal-plan')
      return
    }
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: { xs: 'block', md: 'none' },
      }}
    >
      <BottomNavigation value={value} onChange={handleChange} showLabels>
        <BottomNavigationAction
          value="recipes"
          label={t.nav.recipesTab}
          icon={<RestaurantMenuIcon />}
        />
        <BottomNavigationAction
          value="meal-plan"
          label={t.nav.mealPlanTab}
          icon={<CalendarMonthIcon />}
        />
      </BottomNavigation>
    </Paper>
  )
}
