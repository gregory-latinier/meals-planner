'use client'

import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Drawer,
  Fab,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import GridViewIcon from '@mui/icons-material/GridView'
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined'
import ViewListIcon from '@mui/icons-material/ViewList'
import LinkIcon from '@mui/icons-material/Link'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { useRouter } from 'next/navigation'
import MobileBottomNav from '@/components/MobileBottomNav'
import AppTopBar from '@/components/AppTopBar'
import { useT } from '@/i18n/I18nContext'

type SortField = 'updatedAt' | 'title'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'list' | 'grid'

interface RecipeListItem {
  id: string
  title: string
  status: 'draft' | 'published'
  updatedAt: string
  imagePath: string | null
  tags: { id: string; name: string }[]
}

const SORT_STORAGE_KEY = 'mp_recipes_sort'
const VIEW_STORAGE_KEY = 'mp_recipes_view'
const DEFAULT_SORT_BY: SortField = 'updatedAt'
const DEFAULT_ORDER: SortOrder = 'desc'
const DEFAULT_VIEW: ViewMode = 'list'

function readStoredSort(): { sortBy: SortField; order: SortOrder } {
  const raw = globalThis.localStorage?.getItem(SORT_STORAGE_KEY)
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
  const raw = globalThis.localStorage?.getItem(VIEW_STORAGE_KEY)
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          flexShrink: 0,
          gap: 0.5,
        }}
      >
        <ImageNotSupportedOutlinedIcon fontSize="small" />
        <Typography variant="caption">{fallbackLabel}</Typography>
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

export default function RecipesClient() {
  const router = useRouter()
  const { t } = useT()

  const [sortBy, setSortBy] = useState<SortField>(() => readStoredSort().sortBy)
  const [order, setOrder] = useState<SortOrder>(() => readStoredSort().order)
  const [viewMode, setViewMode] = useState<ViewMode>(() => readStoredView())
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chooserOpen, setChooserOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortBy, order }))
  }, [sortBy, order])

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    let active = true

    async function loadRecipes() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({ sortBy, order })
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
  }, [sortBy, order, t.recipes.errors.loadFailed])

  async function startDraft() {
    setChooserOpen(false)
    const res = await fetch('/api/recipes/draft', { method: 'POST' })
    const data = await res.json()

    if (!res.ok || !data?.recipe?.id) {
      setError(t.recipes.errors.draftCreateFailed)
      return
    }

    router.push(`/recipes/${data.recipe.id}/edit`)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.recipes.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {t.recipes.subtitle}
        </Typography>

        <Tabs value="recipes" sx={{ mb: 3 }} onChange={(_, value: 'recipes' | 'cookbooks') => {
          if (value === 'cookbooks') {
            router.push('/cookbooks')
          }
        }}>
          <Tab value="recipes" label={t.recipes.tabRecipes} />
          <Tab value="cookbooks" label={t.recipes.tabCookbooks} />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t.recipes.viewLabel}
            </Typography>
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
            <ToggleButton value="asc">{t.recipes.orderAsc}</ToggleButton>
            <ToggleButton value="desc">{t.recipes.orderDesc}</ToggleButton>
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
                {t.recipes.noRecipesTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.recipes.noRecipesSubtitle}
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
                onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                      <Typography
                        variant="h5"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          fontSize: { xs: '1.15rem', sm: '1.5rem' },
                        }}
                      >
                        {recipe.title || '—'}
                      </Typography>
                      {recipe.status === 'draft' && (
                        <Chip
                          size="small"
                          color="default"
                          label={t.recipes.statusDraft}
                        />
                      )}
                    </Box>
                    {recipe.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                        {recipe.tags.map((tag) => (
                          <Chip key={tag.id} size="small" label={tag.name} variant="outlined" />
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
                  aspectRatio: '1 / 1',
                  p: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
              >
                <Box sx={{ height: '70%', mb: 1.25 }}>
                  <RecipeImage
                    src={recipe.imagePath}
                    title={recipe.title}
                    fallbackLabel={t.recipes.imageFallback}
                    width="100%"
                    height="100%"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      fontSize: { xs: '1.05rem', sm: '1.15rem' },
                    }}
                  >
                    {recipe.title || '—'}
                  </Typography>
                  {recipe.status === 'draft' && (
                    <Chip
                      size="small"
                      color="default"
                      label={t.recipes.statusDraft}
                    />
                  )}
                </Box>
                {recipe.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', overflow: 'hidden' }}>
                    {recipe.tags.map((tag) => (
                      <Chip key={tag.id} size="small" label={tag.name} variant="outlined" />
                    ))}
                  </Box>
                )}
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

            <Tooltip title={t.recipes.comingSoon}>
              <span>
                <Button fullWidth variant="outlined" startIcon={<PhotoCameraIcon />} disabled>
                  {t.recipes.importPhotoOption}
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={t.recipes.comingSoon}>
              <span>
                <Button fullWidth variant="outlined" startIcon={<LinkIcon />} disabled>
                  {t.recipes.importUrlOption}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
