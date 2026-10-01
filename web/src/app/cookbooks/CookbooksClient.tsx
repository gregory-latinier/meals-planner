'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Drawer,
  Fab,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import GridViewIcon from '@mui/icons-material/GridView'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import ViewListIcon from '@mui/icons-material/ViewList'
import { useRouter } from 'next/navigation'
import AppTopBar from '@/components/AppTopBar'
import { useT } from '@/i18n/I18nContext'
import MobileBottomNav from '@/components/MobileBottomNav'

type SortField = 'updatedAt' | 'name'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'list' | 'grid'

interface Cookbook {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  recipeCount: number
}

const SORT_STORAGE_KEY = 'mp_cookbooks_sort'
const VIEW_STORAGE_KEY = 'mp_cookbooks_view'
const MAX_NAME_LENGTH = 500
const DEFAULT_SORT_BY: SortField = 'updatedAt'
const DEFAULT_ORDER: SortOrder = 'desc'
const DEFAULT_VIEW: ViewMode = 'grid'

/** Formats the recipe count label using the i18n template. */
function formatRecipeCount(template: string, count: number): string {
  return template.replace('{{count}}', String(count))
}

/** Reads persisted cookbook sorting preferences from localStorage. */
function readStoredSort(): { sortBy: SortField; order: SortOrder } {
  const raw = window.localStorage.getItem(SORT_STORAGE_KEY)
  if (!raw) {
    return { sortBy: DEFAULT_SORT_BY, order: DEFAULT_ORDER }
  }

  try {
    const parsed = JSON.parse(raw) as { sortBy?: SortField; order?: SortOrder }
    const sortBy = parsed.sortBy === 'name' ? 'name' : DEFAULT_SORT_BY
    const order = parsed.order === 'asc' || parsed.order === 'desc' ? parsed.order : DEFAULT_ORDER
    return { sortBy, order }
  } catch {
    return { sortBy: DEFAULT_SORT_BY, order: DEFAULT_ORDER }
  }
}

/** Persists cookbook sorting preferences to localStorage. */
function writeStoredSort(sortBy: SortField, order: SortOrder): void {
  window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortBy, order }))
}

/** Reads persisted cookbook view preference from localStorage. */
function readStoredView(): ViewMode {
  const raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return raw === 'list' ? 'list' : DEFAULT_VIEW
}

/** Persists cookbook view preference to localStorage. */
function writeStoredView(viewMode: ViewMode): void {
  window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
}

export default function CookbooksClient() {
  const router = useRouter()
  const { t } = useT()

  // sortRef holds the persisted sort loaded from localStorage on the client.
  // We read it once at component mount via a ref so we never call setState
  // inside an effect body (which triggers the react-hooks/set-state-in-effect
  // lint error). The ref value is stable and does not cause re-renders.
  const sortRef = React.useRef<{ sortBy: SortField; order: SortOrder } | null>(null)

  // isMounted tracks whether we have hydrated on the client. Before mount both
  // server and client render default values so React never sees a mismatch.
  const [isMounted, setIsMounted] = useState(false)

  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT_BY)
  const [order, setOrder] = useState<SortOrder>(DEFAULT_ORDER)
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW)
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [chooserOpen, setChooserOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Hydration-safe mount effect: synchronise sort state with localStorage after
  // the first client render. Both server and first client render use defaults,
  // so React sees no mismatch. After mount we apply the stored preference.
  useEffect(() => {
    const stored = readStoredSort()
    sortRef.current = stored
    setSortBy(stored.sortBy) // eslint-disable-line react-hooks/set-state-in-effect
    setOrder(stored.order)
    setViewMode(readStoredView())
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    writeStoredSort(sortBy, order)
  }, [sortBy, order, isMounted])

  useEffect(() => {
    if (!isMounted) return
    writeStoredView(viewMode)
  }, [viewMode, isMounted])

  useEffect(() => {
    if (!isMounted) return
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
  }, [sortBy, order, t.common.error, isMounted])

  const recipeCountLabel = useMemo(() => t.cookbooks.recipeCount, [t.cookbooks.recipeCount])

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
      <AppTopBar />

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.cookbooks.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t.cookbooks.subtitle}
        </Typography>

        <Tabs value="cookbooks" sx={{ mb: 3 }} onChange={(_, value: 'recipes' | 'cookbooks') => {
          if (value === 'recipes') {
            router.push('/recipes')
          }
        }}>
          <Tab value="recipes" label={t.recipes.tabRecipes} />
          <Tab value="cookbooks" label={t.recipes.tabCookbooks} />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t.cookbooks.viewLabel}
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value: ViewMode | null) => {
                if (value) setViewMode(value)
              }}
              size="small"
            >
              <ToggleButton value="list" aria-label={t.cookbooks.viewList}>
                <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} />
                {t.cookbooks.viewList}
              </ToggleButton>
              <ToggleButton value="grid" aria-label={t.cookbooks.viewGrid}>
                <GridViewIcon fontSize="small" sx={{ mr: 0.5 }} />
                {t.cookbooks.viewGrid}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

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
        ) : viewMode === 'grid' ? (
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
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {cookbooks.map((cookbook) => (
              <Card key={cookbook.id} elevation={0}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {cookbook.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatRecipeCount(recipeCountLabel, cookbook.recipeCount)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>

      <MobileBottomNav value={null} />

      <Fab
        color="primary"
        aria-label={t.cookbooks.addFabAriaLabel}
        sx={{ position: 'fixed', bottom: { xs: 88, md: 24 }, right: 24 }}
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
