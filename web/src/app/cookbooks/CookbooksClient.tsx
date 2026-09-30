'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Drawer,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import LogoutIcon from '@mui/icons-material/Logout'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/useRealtime'
import { useT } from '@/i18n/I18nContext'
import { SUPPORTED_LOCALES } from '@/i18n/types'
import type { Locale } from '@/i18n/types'

type SortField = 'updatedAt' | 'name'
type SortOrder = 'asc' | 'desc'

interface Cookbook {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  recipeCount: number
}

const SORT_STORAGE_KEY = 'mp_cookbooks_sort'
const MAX_NAME_LENGTH = 500

/** Formats the recipe count label using the i18n template. */
function formatRecipeCount(template: string, count: number): string {
  return template.replace('{{count}}', String(count))
}

/** Reads persisted cookbook sorting preferences from localStorage. */
function readStoredSort(): { sortBy: SortField; order: SortOrder } {
  if (typeof window === 'undefined') {
    return { sortBy: 'updatedAt', order: 'desc' }
  }

  const raw = localStorage.getItem(SORT_STORAGE_KEY)
  if (!raw) {
    return { sortBy: 'updatedAt', order: 'desc' }
  }

  try {
    const parsed = JSON.parse(raw) as { sortBy?: SortField; order?: SortOrder }
    const sortBy = parsed.sortBy === 'name' ? 'name' : 'updatedAt'
    const order = parsed.order === 'asc' || parsed.order === 'desc' ? parsed.order : 'desc'
    return { sortBy, order }
  } catch {
    return { sortBy: 'updatedAt', order: 'desc' }
  }
}

/** Persists cookbook sorting preferences to localStorage. */
function writeStoredSort(sortBy: SortField, order: SortOrder): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortBy, order }))
  }
}

export default function CookbooksClient() {
  const router = useRouter()
  const { connected } = useRealtime()
  const { t, locale, setLocale } = useT()

  const [sortBy, setSortBy] = useState<SortField>(() => readStoredSort().sortBy)
  const [order, setOrder] = useState<SortOrder>(() => readStoredSort().order)
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [chooserOpen, setChooserOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    writeStoredSort(sortBy, order)
  }, [sortBy, order])

  useEffect(() => {
    let active = true

    async function fetchCookbooks() {
      setLoading(true)
      setListError('')

      try {
        const params = new URLSearchParams({ sortBy, order })
        const res = await fetch(`/api/cookbooks?${params.toString()}`)
        const data = await res.json()

        if (!res.ok) {
          if (active) setListError(t.common.error)
          return
        }

        if (active) {
          setCookbooks(data.cookbooks ?? [])
        }
      } catch {
        if (active) {
          setListError(t.common.error)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchCookbooks()

    return () => {
      active = false
    }
  }, [sortBy, order, t.common.error])

  const recipeCountLabel = useMemo(() => t.cookbooks.recipeCount, [t.cookbooks.recipeCount])

  function handleLocaleChange(_: React.MouseEvent<HTMLElement>, value: Locale | null) {
    if (value) setLocale(value)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function openCreateDrawer() {
    setChooserOpen(false)
    setCreateError('')
    setName('')
    setCreateOpen(true)
  }

  function closeCreateDrawer() {
    if (!submitting) {
      setCreateOpen(false)
      setCreateError('')
      setName('')
    }
  }

  function getClientValidationError(trimmed: string): string {
    if (!trimmed) return t.cookbooks.errors.required
    if (trimmed.length > MAX_NAME_LENGTH) return t.cookbooks.errors.maxLength
    return ''
  }

  async function handleCreateCookbook(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    const validationError = getClientValidationError(trimmed)

    if (validationError) {
      setCreateError(validationError)
      return
    }

    setSubmitting(true)
    setCreateError('')

    try {
      const res = await fetch('/api/cookbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setCreateError(t.cookbooks.errors.duplicateGeneric)
          return
        }

        if (res.status === 400 && typeof data?.error === 'string') {
          if (data.error.includes('required')) {
            setCreateError(t.cookbooks.errors.required)
            return
          }
          if (data.error.includes('500 characters')) {
            setCreateError(t.cookbooks.errors.maxLength)
            return
          }
        }

        setCreateError(t.cookbooks.errors.createFailed)
        return
      }

      const created = data.cookbook as Cookbook

      setCookbooks((prev) => {
        const next = [created, ...prev]

        return next.sort((a, b) => {
          if (sortBy === 'updatedAt') {
            const aTs = new Date(a.updatedAt).getTime()
            const bTs = new Date(b.updatedAt).getTime()
            return order === 'desc' ? bTs - aTs : aTs - bTs
          }

          const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          return order === 'asc' ? cmp : -cmp
        })
      })

      closeCreateDrawer()
    } catch {
      setCreateError(t.cookbooks.errors.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit">
        <Toolbar>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flexGrow: 1 }}>
            🥗 {t.common.appName}
          </Typography>

          <ToggleButtonGroup
            value={locale}
            exclusive
            onChange={handleLocaleChange}
            size="small"
            sx={{ mr: 2 }}
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <ToggleButton
                key={loc}
                value={loc}
                sx={{ px: 1.5, py: 0.25, textTransform: 'uppercase', fontSize: '0.75rem' }}
              >
                {loc}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Tooltip title={connected ? t.nav.realtimeConnected : t.nav.realtimeDisconnected}>
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {connected ? (
                <WifiIcon fontSize="small" color="success" />
              ) : (
                <WifiOffIcon fontSize="small" color="error" />
              )}
              <Typography variant="caption" color={connected ? 'success.main' : 'error.main'}>
                {connected ? t.nav.live : t.nav.offline}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title={t.nav.logout}>
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.cookbooks.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t.cookbooks.subtitle}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="cookbooks-sort-by-label">{t.cookbooks.sortLabel}</InputLabel>
            <Select
              labelId="cookbooks-sort-by-label"
              label={t.cookbooks.sortLabel}
              value={sortBy}
              onChange={(event) => {
                const value = event.target.value as SortField
                setSortBy(value)
              }}
            >
              <MenuItem value="updatedAt">{t.cookbooks.sortUpdated}</MenuItem>
              <MenuItem value="name">{t.cookbooks.sortName}</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={order}
            exclusive
            onChange={(_, value: SortOrder | null) => {
              if (value) setOrder(value)
            }}
            size="small"
          >
            <ToggleButton value="asc">{t.cookbooks.orderAsc}</ToggleButton>
            <ToggleButton value="desc">{t.cookbooks.orderDesc}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {listError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {listError}
          </Alert>
        )}

        {!loading && cookbooks.length === 0 ? (
          <Card elevation={0}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t.cookbooks.noCookbooksTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.cookbooks.noCookbooksSubtitle}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {cookbooks.map((cookbook) => (
              <Grid key={cookbook.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card elevation={0}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {cookbook.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatRecipeCount(recipeCountLabel, cookbook.recipeCount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label={t.cookbooks.addFabAriaLabel}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setChooserOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Drawer anchor="bottom" open={chooserOpen} onClose={() => setChooserOpen(false)}>
        <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.cookbooks.addChooserTitle}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Tooltip title={t.cookbooks.recipeComingSoon}>
                <span>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<RestaurantMenuIcon />}
                    disabled
                  >
                    {t.cookbooks.addRecipeOption}
                  </Button>
                </span>
              </Tooltip>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<MenuBookIcon />}
                onClick={openCreateDrawer}
              >
                {t.cookbooks.addCookbookOption}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Drawer>

      <Drawer anchor="bottom" open={createOpen} onClose={closeCreateDrawer}>
        <Box
          component="form"
          onSubmit={handleCreateCookbook}
          sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.cookbooks.createDialogTitle}
          </Typography>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          <TextField
            fullWidth
            label={t.cookbooks.nameLabel}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
            slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
            disabled={submitting}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={closeCreateDrawer} disabled={submitting}>
              {t.cookbooks.cancelButton}
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {t.cookbooks.createButton}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
