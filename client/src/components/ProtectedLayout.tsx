import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'

export function ProtectedLayout() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let active = true

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (!active) return
        if (res.ok) {
          setAuthenticated(true)
        } else {
          setAuthenticated(false)
        }
      } catch {
        if (active) setAuthenticated(false)
      } finally {
        if (active) setLoading(false)
      }
    }

    checkAuth()

    return () => {
      active = false
    }
  }, [location.pathname])

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!authenticated) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <Outlet />
}
