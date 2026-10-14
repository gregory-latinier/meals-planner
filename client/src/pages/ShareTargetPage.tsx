import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n/I18nContext'

const URL_PATTERN = /https?:\/\/\S+/iu

/** Instagram (and others) put the link in `url`, or inside the free-form `text` / `title`. */
function findSharedUrl(params: URLSearchParams): string | null {
  for (const key of ['url', 'text', 'title']) {
    const match = params.get(key)?.match(URL_PATTERN)
    if (match) return match[0]
  }
  return null
}

/** Landing page of the Web Share Target: imports the shared link as a new recipe draft. */
export default function ShareTargetPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const startedRef = useRef(false)

  const sharedUrl = findSharedUrl(searchParams)

  const runImport = useCallback(
    async (sourceUrl: string) => {
      setError('')
      try {
        const res = await fetch('/api/recipes/import/web-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl }),
        })
        const data = await res.json().catch(() => null)

        if (!res.ok || !data?.recipe?.id) {
          const base =
            data?.error === 'Invalid URL.' ? t.recipes.errors.importUrlInvalid : t.recipes.errors.importUrlFailed
          // Append the server's reason (missing API key, Instagram blocked, ...) to make the failure diagnosable.
          const reason = typeof data?.error === 'string' && data.error !== 'Invalid URL.' ? data.error : ''
          setError(reason ? `${base} (${reason})` : base)
          return
        }

        navigate(`/recipes/${data.recipe.id}/edit`, { replace: true })
      } catch {
        setError(t.recipes.errors.importUrlFailed)
      }
    },
    [navigate, t.recipes.errors.importUrlFailed, t.recipes.errors.importUrlInvalid]
  )

  useEffect(() => {
    // Guard against React StrictMode running effects twice (would create two drafts).
    if (startedRef.current || !sharedUrl) return
    startedRef.current = true
    void runImport(sharedUrl)
  }, [sharedUrl, runImport])

  const failure = !sharedUrl ? t.recipes.errors.shareNoUrl : error

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 420, width: '100%' }}>
        {failure ? (
          <>
            <Alert severity="error" sx={{ width: '100%' }}>
              {failure}
            </Alert>
            <Stack direction="row" spacing={1}>
              {sharedUrl && (
                <Button variant="contained" onClick={() => void runImport(sharedUrl)}>
                  {t.recipes.instagramImport.importAction}
                </Button>
              )}
              <Button onClick={() => navigate('/recipes', { replace: true })}>{t.recipes.backToRecipes}</Button>
            </Stack>
          </>
        ) : (
          <>
            <CircularProgress />
            <Typography color="text.secondary">{t.recipes.importUrlLoading}</Typography>
          </>
        )}
      </Stack>
    </Box>
  )
}
