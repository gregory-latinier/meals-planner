'use client'

import React, { Suspense, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Container,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useRouter, useSearchParams } from 'next/navigation'
import { useT } from '@/i18n/I18nContext'
import { getSafeNextPath } from '@/lib/safe-next'

const API_ERROR_MAP: Record<string, string> = {
  'Incorrect password.': 'errorIncorrect',
  'Too many attempts. Please try again later.': 'errorTooMany',
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useT()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const mappedKey = data.error ? API_ERROR_MAP[data.error] : undefined
        const loginT = t.auth.login
        setError(
          mappedKey && mappedKey in loginT
            ? loginT[mappedKey as keyof typeof loginT]
            : loginT.errorGeneric
        )
        return
      }

      const nextPath = getSafeNextPath(searchParams.get('next'))
      router.push(nextPath)
      router.refresh()
    } catch {
      setError(t.auth.login.errorNetwork)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.06)} 100%)`,
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            🥗 {t.common.appName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t.common.appTagline}
          </Typography>
        </Box>

        <Card elevation={0}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
              {t.auth.login.title}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label={t.auth.login.passwordLabel}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !password}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : t.auth.login.submitButton}
              </Button>
            </form>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link href="/forgot-password" variant="body2" color="text.secondary">
                {t.auth.login.forgotPassword}
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
