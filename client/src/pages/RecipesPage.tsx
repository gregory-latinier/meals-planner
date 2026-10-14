import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Drawer,
  Fab,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ClearIcon from '@mui/icons-material/Clear'
import GridViewIcon from '@mui/icons-material/GridView'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SearchIcon from '@mui/icons-material/Search'
import ViewListIcon from '@mui/icons-material/ViewList'
import LinkIcon from '@mui/icons-material/Link'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MobileBottomNav from '@/components/MobileBottomNav'
import AppTopBar from '@/components/AppTopBar'
import { useT } from '@/i18n/I18nContext'
import { createMealPlan } from '@/api/meal-plans'
import { getNextWeekMonday } from '@/lib/date-utils'

type SortField = 'updatedAt' | 'title'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'list' | 'grid'

interface RecipeListItem {
  id: string
  title: string
  status: 'draft' | 'published'
  prepMinutes: number | null
  cookMinutes: number | null
  updatedAt: string
  imagePath: string | null
  tags: { id: string; name: string }[]
}

function formatTemplate(template: string, value: string | number): string {
  return template.replace(/\{\{\s*value\s*\}\}/g, String(value))
}

/** Prep + cook time as "45 min" or "1 h 05"; null when neither is set. */
function formatTotalTime(recipe: RecipeListItem): string | null {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
  if (total <= 0) return null
  if (total < 60) return `${total} min`
  const minutes = total % 60
  return `${Math.floor(total / 60)} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}`
}

const SORT_STORAGE_KEY ='mp_recipes_sort'
const VIEW_STORAGE_KEY = 'mp_recipes_view'
const DEFAULT_SORT_BY: SortField = 'updatedAt'
const DEFAULT_ORDER: SortOrder = 'desc'
const DEFAULT_VIEW: ViewMode = 'list'

function readStoredSort(): { sortBy: SortField; order: SortOrder } {
  const raw = window.localStorage.getItem(SORT_STORAGE_KEY)
  if (!raw) {
    return { sortBy: DEFAULT_SORT_BY, order: DEFAULT_ORDER }
  }

  try {
    const parsed = JSON.parse(raw) as { sortBy?: SortField; order?: SortOrder }
    return {
      sortBy: parsed.sortBy === 'title' ? 'title' : DEFAULT_SORT_BY,
      order: parsed.order === 'asc' ? 'asc' : DEFAULT_ORDER,
    }
  } catch {
    return { sortBy: DEFAULT_SORT_BY, order: DEFAULT_ORDER }
  }
}

function readStoredView(): ViewMode {
  const raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return raw === 'grid' ? 'grid' : DEFAULT_VIEW
}

interface RecipeImageProps {
  src: string | null
  title: string
  fallbackLabel: string
  width: number | string
  height: number | string
}

function RecipeImage({ src, title, fallbackLabel, width, height }: RecipeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = Boolean(src && failedSrc === src)

  if (!src || broken) {
    return (
      <Box
        sx={{
          width,
          height,
          bgcolor: 'action.hover',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          flexShrink: 0,
        }}
      >
        <RestaurantIcon sx={{ fontSize: 32, opacity: 0.6 }} />
      </Box>
    )
  }

  return (
    <Box
      component="img"
      src={src}
      alt={title || fallbackLabel}
      onError={() => setFailedSrc(src)}
      sx={{
        width,
        height,
        objectFit: 'cover',
        borderRadius: 1,
        display: 'block',
        flexShrink: 0,
      }}
    />
  )
}

export default function RecipesPage() {
  const navigate = useNavigate()
  const { t } = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  // The URL is the source of truth, so clicking a cookbook (or sharing the link) preloads the filter.
  const cookbookFilter = searchParams.get('cookbookId') ?? ''
  const [cookbookOptions, setCookbookOptions] = useState<{ id: string; name: string }[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT_BY)
  const [order, setOrder] = useState<SortOrder>(DEFAULT_ORDER)
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW)
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [chooserOpen, setChooserOpen] = useState(false)
  const [urlImportOpen, setUrlImportOpen] = useState(false)
  const [importUrlValue, setImportUrlValue] = useState('')
  const [importUrlLoading, setImportUrlLoading] = useState(false)
  const [importUrlError, setImportUrlError] = useState('')
  const [textImportOpen, setTextImportOpen] = useState(false)
  const [importTextValue, setImportTextValue] = useState('')
  const [importTextLoading, setImportTextLoading] = useState(false)
  const [importTextError, setImportTextError] = useState('')
  const [addingRecipeIds, setAddingRecipeIds] = useState<Set<string>>(new Set())
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success')

  async function handleAddToMealPlan(e: React.MouseEvent, recipe: RecipeListItem) {
    e.stopPropagation()
    if (addingRecipeIds.has(recipe.id)) return

    setAddingRecipeIds((prev) => new Set(prev).add(recipe.id))
    try {
      const nextWeekMondayStr = getNextWeekMonday()
      await createMealPlan({
        title: recipe.title || t.recipes.untitledFallback,
        recipeId: recipe.id,
        weekStartDate: nextWeekMondayStr,
        mealType: 'dinner',
      })
      setSnackbarSeverity('success')
      setSnackbarMessage(t.recipes.addedToNextWeekPlan)
    } catch {
      setSnackbarSeverity('error')
      setSnackbarMessage(t.recipes.errors.addToPlanFailed)
    } finally {
      setAddingRecipeIds((prev) => {
        const next = new Set(prev)
        next.delete(recipe.id)
        return next
      })
    }
  }

  useEffect(() => {
    const storedSort = readStoredSort()
    const storedView = readStoredView()

    setSortBy(storedSort.sortBy)
    setOrder(storedSort.order)
    setViewMode(storedView)
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortBy, order }))
  }, [sortBy, order, isMounted])

  useEffect(() => {
    if (!isMounted) return
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode, isMounted])

  function changeCookbookFilter(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next) params.set('cookbookId', next)
        else params.delete('cookbookId')
        return params
      },
      { replace: true }
    )
  }

  useEffect(() => {
    let active = true
    async function loadCookbooks() {
      try {
        const res = await fetch('/api/cookbooks?sortBy=name&order=asc')
        const data = await res.json()
        if (!res.ok || !active) return
        const options = ((data.cookbooks ?? []) as { id: string; name: string }[]).map((cb) => ({
          id: cb.id,
          name: cb.name,
        }))
        setCookbookOptions(options)
        // A stale link to a deleted cookbook would otherwise filter everything out silently.
        const requested = new URLSearchParams(window.location.search).get('cookbookId')
        if (requested && !options.some((cb) => cb.id === requested)) {
          changeCookbookFilter('')
        }
      } catch {
        // The filter is optional: the list still works without it.
      }
    }
    void loadCookbooks()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    if (!isMounted) return
    let active = true

    async function loadRecipes() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({ sortBy, order })
        if (debouncedSearch) {
          params.set('search', debouncedSearch)
        }
        if (cookbookFilter) {
          params.set('cookbookId', cookbookFilter)
        }
        const res = await fetch(`/api/recipes?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) {
          if (active) setError(t.recipes.errors.loadFailed)
          return
        }

        if (active) {
          setRecipes((data.recipes ?? []) as RecipeListItem[])
        }
      } catch {
        if (active) setError(t.recipes.errors.loadFailed)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRecipes()

    return () => {
      active = false
    }
  }, [sortBy, order, debouncedSearch, cookbookFilter, t.recipes.errors.loadFailed, isMounted])

  async function startDraft() {
    setChooserOpen(false)
    const res = await fetch('/api/recipes/draft', { method: 'POST' })
    const data = await res.json()

    if (!res.ok || !data?.recipe?.id) {
      setError(t.recipes.errors.draftCreateFailed)
      return
    }

    navigate(`/recipes/${data.recipe.id}/edit`)
  }

  async function importFromWebUrl() {
    setImportUrlError('')

    const sourceUrl = importUrlValue.trim()
    if (!sourceUrl) {
      setImportUrlError(t.recipes.errors.importUrlRequired)
      return
    }

    setImportUrlLoading(true)
    try {
      const res = await fetch('/api/recipes/import/web-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceUrl }),
      })
      const data = await res.json()

      if (!res.ok || !data?.recipe?.id) {
        if (data?.error === 'Invalid URL.') {
          setImportUrlError(t.recipes.errors.importUrlInvalid)
          return
        }
        setImportUrlError(t.recipes.errors.importUrlFailed)
        return
      }

      setChooserOpen(false)
      navigate(`/recipes/${data.recipe.id}/edit`)
    } catch {
      setImportUrlError(t.recipes.errors.importUrlFailed)
    } finally {
      setImportUrlLoading(false)
    }
  }

  async function importFromText() {
    setImportTextError('')

    const importText = importTextValue.trim()
    if (!importText) {
      setImportTextError(t.recipes.errors.importTextRequired)
      return
    }

    setImportTextLoading(true)
    try {
      const res = await fetch('/api/recipes/import/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ importText }),
      })
      const data = await res.json()

      if (!res.ok || !data?.recipe?.id) {
        if (data?.error === 'Invalid import text.') {
          setImportTextError(t.recipes.errors.importTextInvalid)
          return
        }
        setImportTextError(t.recipes.errors.importTextFailed)
        return
      }

      setChooserOpen(false)
      navigate(`/recipes/${data.recipe.id}/edit`)
    } catch {
      setImportTextError(t.recipes.errors.importTextFailed)
    } finally {
      setImportTextLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        <Tabs value="recipes" sx={{ mb: 3 }} onChange={(_, value: 'recipes' | 'cookbooks') => {
          if (value === 'cookbooks') {
            navigate('/cookbooks')
          }
        }}>
          <Tab value="recipes" label={t.recipes.tabRecipes} />
          <Tab value="cookbooks" label={t.recipes.tabCookbooks} />
        </Tabs>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.recipes.searchPlaceholder}
            aria-label={t.recipes.searchLabel}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={t.recipes.clearSearchAriaLabel}
                      onClick={() => setSearchQuery('')}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, next: ViewMode | null) => {
                if (next) setViewMode(next)
              }}
              size="small"
            >
              <ToggleButton value="list" aria-label={t.recipes.viewList}>
                <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} />
                {t.recipes.viewList}
              </ToggleButton>
              <ToggleButton value="grid" aria-label={t.recipes.viewGrid}>
                <GridViewIcon fontSize="small" sx={{ mr: 0.5 }} />
                {t.recipes.viewGrid}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {cookbookOptions.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="recipes-cookbook-filter-label">{t.recipes.cookbookLabel}</InputLabel>
              <Select
                labelId="recipes-cookbook-filter-label"
                label={t.recipes.cookbookLabel}
                value={cookbookOptions.some((cb) => cb.id === cookbookFilter) ? cookbookFilter : ''}
                onChange={(event) => changeCookbookFilter(event.target.value)}
              >
                <MenuItem value="">{t.recipes.allCookbooksOption}</MenuItem>
                {cookbookOptions.map((cb) => (
                  <MenuItem key={cb.id} value={cb.id}>
                    {cb.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="recipes-sort-by-label">{t.recipes.sortLabel}</InputLabel>
            <Select
              labelId="recipes-sort-by-label"
              label={t.recipes.sortLabel}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortField)}
            >
              <MenuItem value="updatedAt">{t.recipes.sortUpdated}</MenuItem>
              <MenuItem value="title">{t.recipes.sortTitle}</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={order}
            exclusive
            onChange={(_, next: SortOrder | null) => {
              if (next) setOrder(next)
            }}
            size="small"
          >
            <Tooltip title={t.recipes.orderAsc}>
              <ToggleButton value="asc" aria-label={t.recipes.orderAsc}>
                <ArrowUpwardIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title={t.recipes.orderDesc}>
              <ToggleButton value="desc" aria-label={t.recipes.orderDesc}>
                <ArrowDownwardIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && recipes.length === 0 ? (
          <Card elevation={0}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {debouncedSearch || cookbookFilter ? t.recipes.noSearchResultsTitle : t.recipes.noRecipesTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {debouncedSearch || cookbookFilter ? t.recipes.noSearchResultsSubtitle : t.recipes.noRecipesSubtitle}
              </Typography>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Box sx={{ display: 'grid', gap: 0 }}>
            {recipes.map((recipe) => (
              <Box
                key={recipe.id}
                sx={{
                  cursor: 'pointer',
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.25 }}>
                  <RecipeImage
                    src={recipe.imagePath}
                    title={recipe.title}
                    fallbackLabel={t.recipes.imageFallback}
                    width={116}
                    height={116}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: '1.15rem', sm: '1.5rem' },
                          lineHeight: 1.3,
                        }}
                      >
                        {recipe.title || '—'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        {recipe.status === 'draft' && (
                          <Chip
                            size="small"
                            color="default"
                            label={t.recipes.statusDraft}
                          />
                        )}
                        {formatTotalTime(recipe) && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={formatTemplate(t.recipes.metaTotalTime, formatTotalTime(recipe)!)}
                          />
                        )}
                        <Tooltip title={t.recipes.addToMealPlan}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={t.recipes.addToMealPlan}
                              disabled={addingRecipeIds.has(recipe.id)}
                              onClick={(e) => void handleAddToMealPlan(e, recipe)}
                            >
                              {addingRecipeIds.has(recipe.id) ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <CalendarMonthIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                    {recipe.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                        {recipe.tags.map((tag) => (
                          <Chip key={tag.id} size="small" label={tag.name} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2.25,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                xl: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {recipes.map((recipe) => (
              <Box
                key={recipe.id}
                data-testid="recipe-grid-card"
                sx={{
                  cursor: 'pointer',
                  p: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <Box sx={{ width: '100%', aspectRatio: '16 / 10', mb: 1.25 }}>
                  <RecipeImage
                    src={recipe.imagePath}
                    title={recipe.title}
                    fallbackLabel={t.recipes.imageFallback}
                    width="100%"
                    height="100%"
                  />
                </Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '1.05rem', sm: '1.15rem' },
                    lineHeight: 1.3,
                    mb: 0.75,
                  }}
                >
                  {recipe.title || '—'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {recipe.status === 'draft' && (
                      <Chip
                        size="small"
                        color="default"
                        label={t.recipes.statusDraft}
                      />
                    )}
                    {formatTotalTime(recipe) && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={formatTemplate(t.recipes.metaTotalTime, formatTotalTime(recipe)!)}
                      />
                    )}
                  </Box>
                  <Tooltip title={t.recipes.addToMealPlan}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t.recipes.addToMealPlan}
                        disabled={addingRecipeIds.has(recipe.id)}
                        onClick={(e) => void handleAddToMealPlan(e, recipe)}
                      >
                        {addingRecipeIds.has(recipe.id) ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <CalendarMonthIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <Box sx={{ flex: 1 }} />
              </Box>
            ))}
          </Box>
        )}
      </Container>

      <MobileBottomNav value="recipes" />

      <Fab
        color="primary"
        aria-label={t.recipes.addFabAriaLabel}
        sx={{ position: 'fixed', bottom: { xs: 88, md: 24 }, right: 24 }}
        onClick={() => setChooserOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Drawer anchor="bottom" open={chooserOpen} onClose={() => setChooserOpen(false)}>
        <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.recipes.addChooserTitle}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Button variant="contained" startIcon={<EditNoteIcon />} onClick={startDraft}>
              {t.recipes.writeFromScratchOption}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditNoteIcon />}
              onClick={() => {
                setTextImportOpen((prev) => !prev)
                setImportTextError('')
              }}
            >
              {t.recipes.importTextOption}
            </Button>

            {textImportOpen && (
              <Box sx={{ display: 'grid', gap: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="text.secondary">
                  {t.recipes.importTextHint}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  label={t.recipes.importTextFieldLabel}
                  placeholder={t.recipes.importTextFieldPlaceholder}
                  value={importTextValue}
                  onChange={(event) => setImportTextValue(event.target.value)}
                  disabled={importTextLoading}
                />
                {importTextError && <Alert severity="error">{importTextError}</Alert>}
                <Button variant="contained" onClick={() => void importFromText()} disabled={importTextLoading}>
                  {importTextLoading ? t.recipes.importTextLoading : t.recipes.importTextAction}
                </Button>
              </Box>
            )}

            <Button
              fullWidth
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => {
                setUrlImportOpen((prev) => !prev)
                setImportUrlError('')
              }}
            >
              {t.recipes.importUrlOption}
            </Button>

            {urlImportOpen && (
              <Box sx={{ display: 'grid', gap: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="text.secondary">
                  {t.recipes.importUrlHint}
                </Typography>
                <TextField
                  fullWidth
                  type="url"
                  label={t.recipes.importUrlFieldLabel}
                  placeholder={t.recipes.importUrlFieldPlaceholder}
                  value={importUrlValue}
                  onChange={(event) => setImportUrlValue(event.target.value)}
                  disabled={importUrlLoading}
                />
                {importUrlError && <Alert severity="error">{importUrlError}</Alert>}
                <Button variant="contained" onClick={() => void importFromWebUrl()} disabled={importUrlLoading}>
                  {importUrlLoading ? t.recipes.importUrlLoading : t.recipes.importUrlAction}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarMessage(null)}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
