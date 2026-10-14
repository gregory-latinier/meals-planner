import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n/I18nContext'

const URL_PATTERN = /https?:\/\/\S+/iu
const URL_PATTERN_GLOBAL = /https?:\/\/\S+/giu
// Below this amount of text (once links are removed) the share is just a link, not a recipe.
const MIN_RECIPE_TEXT_LENGTH = 80

/** Instagram (and others) put the link in `url`, or inside the free-form `text` / `title`. */
function findSharedUrl(params: URLSearchParams): string | null {
  for (const key of ['url', 'text', 'title']) {
    const match = params.get(key)?.match(URL_PATTERN)
    if (match) return match[0]
  }
  return null
}

/** Text shared on its own (e.g. extracted from a screenshot), with links removed. */
function findSharedRecipeText(params: URLSearchParams): string | null {
  const text = (params.get('text') ?? '').replace(URL_PATTERN_GLOBAL, ' ').trim()
  return text.length >= MIN_RECIPE_TEXT_LENGTH ? (params.get('text') ?? '').trim() : null
}

/** Landing page of the Web Share Target: imports the shared text or link as a new recipe draft. */
export default function ShareTargetPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pastedText, setPastedText] = useState('')
  const startedRef = useRef(false)

  const sharedUrl = findSharedUrl(searchParams)
  const sharedText = findSharedRecipeText(searchParams)

  const runImport = useCallback(
    async (kind: 'url' | 'text', value: string) => {
      setError('')
      setLoading(true)
      try {
        const res = await fetch(kind === 'url' ? '/api/recipes/import/web-url' : '/api/recipes/import/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kind === 'url' ? { sourceUrl: value } : { importText: value }),
        })
        const data = await res.json().catch(() => null)

        if (!res.ok || !data?.recipe?.id) {
          const base = kind === 'url' ? t.recipes.errors.importUrlFailed : t.recipes.errors.importTextFailed
          // Append the server's reason (missing API key, Instagram blocked, ...) to make the failure diagnosable.
          const reason =
            typeof data?.error === 'string' && !data.error.startsWith('Invalid') ? data.error : ''
          setError(reason ? `${base} (${reason})` : base)
          setLoading(false)
          return
        }

        navigate(`/recipes/${data.recipe.id}/edit`, { replace: true })
      } catch {
        setError(kind === 'url' ? t.recipes.errors.importUrlFailed : t.recipes.errors.importTextFailed)
        setLoading(false)
      }
    },
    [navigate, t.recipes.errors.importTextFailed, t.recipes.errors.importUrlFailed]
  )

  useEffect(() => {
    // Guard against React StrictMode running effects twice (would create two drafts).
    if (startedRef.current) return
    startedRef.current = true

    // Real recipe text wins over a link: it never depends on the site (Instagram blocks the server).
    if (sharedText) {
      void runImport('text', sharedText)
    } else if (sharedUrl) {
      void runImport('url', sharedUrl)
    } else {
      setLoading(false)
      setError(t.recipes.errors.shareNoUrl)
    }
  }, [sharedText, sharedUrl, runImport, t.recipes.errors.shareNoUrl])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 480, width: '100%' }}>
        {loading ? (
          <>
            <CircularProgress />
            <Typography color="text.secondary">{t.recipes.importTextLoading}</Typography>
          </>
        ) : (
          <>
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
            {/* Fallback: paste the recipe text yourself */}
            <TextField
              label={t.recipes.importTextFieldLabel}
              placeholder={t.recipes.importTextFieldPlaceholder}
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              multiline
              minRows={5}
              maxRows={12}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={!pastedText.trim()}
                onClick={() => void runImport('text', pastedText.trim())}
              >
                {t.recipes.importTextAction}
              </Button>
              <Button onClick={() => navigate('/recipes', { replace: true })}>{t.recipes.backToRecipes}</Button>
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  )
}
