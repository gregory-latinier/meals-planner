'use client'

import React, { useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, TextField, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import AppTopBar from '@/components/AppTopBar'
import MobileBottomNav from '@/components/MobileBottomNav'
import { useT } from '@/i18n/I18nContext'
import { InstagramShareValidationError, validateInstagramShareUrl } from '@/lib/instagram-share'

interface InstagramImportClientProps {
  initialSourceUrl: string
  initialError: InstagramShareValidationError | null
}

export default function InstagramImportClient({
  initialSourceUrl,
  initialError,
}: InstagramImportClientProps) {
  const router = useRouter()
  const { t } = useT()

  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<InstagramShareValidationError | 'importFailed' | null>(initialError)

  const errorMessage = useMemo(() => {
    if (!error) return null

    if (error === 'importFailed') {
      return t.recipes.errors.importUrlFailed
    }

    return t.recipes.instagramImport.errors[error]
  }, [error, t.recipes.errors.importUrlFailed, t.recipes.instagramImport.errors])

  async function handleImport() {
    setError(null)

    const validation = validateInstagramShareUrl(sourceUrl)
    if (!validation.ok || !validation.normalizedUrl) {
      setError(validation.error ?? 'invalidUrl')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/recipes/import/web-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceUrl: validation.normalizedUrl }),
      })
      const data = await res.json()

      if (!res.ok || !data?.recipe?.id) {
        setError('importFailed')
        return
      }

      router.push(`/recipes/${data.recipe.id}/edit`)
    } catch {
      setError('importFailed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="sm" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        <Card elevation={0}>
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {t.recipes.instagramImport.title}
              </Typography>
              <Typography color="text.secondary">
                {t.recipes.instagramImport.subtitle}
              </Typography>
            </Box>

            <TextField
              label={t.recipes.instagramImport.urlLabel}
              value={sourceUrl}
              type="url"
              onChange={(event) => setSourceUrl(event.target.value)}
              disabled={loading}
              fullWidth
              placeholder={t.recipes.instagramImport.urlPlaceholder}
            />

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => router.push('/recipes')} disabled={loading}>
                {t.recipes.instagramImport.cancelAction}
              </Button>
              <Button variant="contained" onClick={() => void handleImport()} disabled={loading}>
                {loading ? (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} color="inherit" />
                    <span>{t.recipes.instagramImport.importLoading}</span>
                  </Box>
                ) : (
                  t.recipes.instagramImport.importAction
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>

      <MobileBottomNav value="recipes" />
    </Box>
  )
}
