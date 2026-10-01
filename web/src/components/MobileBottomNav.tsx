'use client'

import React from 'react'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { useRouter } from 'next/navigation'
import { useT } from '@/i18n/I18nContext'

export type MobileBottomNavValue = 'recipes' | 'stores'

interface MobileBottomNavProps {
  value: MobileBottomNavValue | null
}

export default function MobileBottomNav({ value }: MobileBottomNavProps) {
  const router = useRouter()
  const { t } = useT()

  function handleChange(_: React.SyntheticEvent, nextValue: MobileBottomNavValue) {
    if (nextValue === value) {
      return
    }

    if (nextValue === 'recipes') {
      router.push('/recipes')
      return
    }

    router.push('/stores')
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
          value="stores"
          label={t.nav.storesTab}
          icon={<StorefrontIcon />}
        />
      </BottomNavigation>
    </Paper>
  )
}
