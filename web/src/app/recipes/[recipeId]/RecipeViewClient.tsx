'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  IconButton,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { useRouter } from 'next/navigation'
import AppTopBar from '@/components/AppTopBar'
import MobileBottomNav from '@/components/MobileBottomNav'
import { useT } from '@/i18n/I18nContext'
import { scaleQuantityText } from '@/lib/recipe-quantity-scaling'

type RecipeStatus = 'draft' | 'published'
type RowKind = 'heading' | 'item'

interface RecipeTag {
  id: string
  name: string
}

interface IngredientRow {
  id: string
  kind: RowKind
  heading: string | null
  quantity: string | null
  note: string | null
  ingredient: { id: string; name: string } | null
  unit: { id: string; name: string } | null
}

interface InstructionRow {
  kind: RowKind
  text: string
}

interface RecipeView {
  id: string
  title: string
  status: RecipeStatus
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  sourceUrl: string | null
  imagePath: string | null
  cookbook: { id: string; name: string } | null
  tags: RecipeTag[]
  ingredientRows: IngredientRow[]
  instructions: InstructionRow[]
}

interface RecipeViewClientProps {
  recipeId: string
}

function formatTemplate(template: string, value: string | number): string {
  return template.replace('{{value}}', String(value))
}

function IngredientRowText({ row, quantityText }: { row: IngredientRow; quantityText: string | null }) {
  const parts = [quantityText, row.unit?.name, row.ingredient?.name].filter(
    (value): value is string => Boolean(value && value.trim())
  )
  const leading = parts.join(' ').trim()
  const note = row.note?.trim() ?? ''
  const text = leading && note ? `${leading} — ${note}` : leading || note

  return <>{text || '—'}</>
}

function RecipeHeaderImage({ src, alt, fallbackLabel }: { src: string | null; alt: string; fallbackLabel: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = Boolean(src && failedSrc === src)

  if (!src || broken) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: 220,
          bgcolor: 'action.hover',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
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
      alt={alt}
      onError={() => setFailedSrc(src)}
      sx={{
        width: '100%',
        maxHeight: 360,
        objectFit: 'cover',
        borderRadius: 2,
        display: 'block',
      }}
    />
  )
}

export default function RecipeViewClient({ recipeId }: RecipeViewClientProps) {
  const router = useRouter()
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recipe, setRecipe] = useState<RecipeView | null>(null)
  const [targetServings, setTargetServings] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    async function loadRecipe() {
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/recipes/${recipeId}`)
        const data = await res.json()

        if (!res.ok) {
          if (active) {
            setError(t.recipes.errors.viewLoadFailed)
          }
          return
        }

        if (active) {
          const loadedRecipe = (data.recipe ?? null) as RecipeView | null
          setRecipe(loadedRecipe)
          setTargetServings(loadedRecipe?.servings ?? null)
        }
      } catch {
        if (active) {
          setError(t.recipes.errors.viewLoadFailed)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadRecipe()

    return () => {
      active = false
    }
  }, [recipeId, t.recipes.errors.viewLoadFailed])

  const title = recipe?.title?.trim() ? recipe.title : t.recipes.untitledFallback
  const metaItems = useMemo(() => {
    if (!recipe) return []

    const items: string[] = []

    if (recipe.prepMinutes !== null) {
      items.push(formatTemplate(t.recipes.metaPrepMinutes, recipe.prepMinutes))
    }
    if (recipe.cookMinutes !== null) {
      items.push(formatTemplate(t.recipes.metaCookMinutes, recipe.cookMinutes))
    }

    return items
  }, [recipe, t.recipes.metaCookMinutes, t.recipes.metaPrepMinutes])

  const servingsScaleFactor =
    !recipe?.servings || !targetServings || recipe.servings <= 0 || targetServings <= 0
      ? 1
      : targetServings / recipe.servings

  const canDecreaseServings = targetServings !== null && targetServings > 1

  const ingredientRows = recipe?.ingredientRows ?? []
  const instructionRows = recipe?.instructions ?? []

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="md" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.common.loading}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && recipe && (
          <>
            <Card elevation={0} sx={{ mb: 2 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ position: 'relative' }}>
                    <RecipeHeaderImage src={recipe.imagePath} alt={title} fallbackLabel={t.recipes.imageFallback} />

                    <Stack
                      data-testid="recipe-view-image-actions"
                      direction="row"
                      spacing={0.75}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={t.recipes.backToRecipes}
                        onClick={() => router.push('/recipes')}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                        }}
                      >
                        <ArrowBackIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={t.recipes.editRecipeButton}
                        onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {title}
                      </Typography>
                      {recipe.status === 'draft' && <Chip size="small" label={t.recipes.statusDraft} />}
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      {recipe.cookbook && <Chip size="small" variant="outlined" label={recipe.cookbook.name} />}
                      {metaItems.map((item) => (
                        <Chip key={item} size="small" variant="outlined" label={item} />
                      ))}
                    </Stack>

                    {recipe.servings !== null && targetServings !== null && (
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Typography variant="body2">
                          {formatTemplate(t.recipes.metaServings, targetServings)}
                        </Typography>
                        <IconButton
                          aria-label={t.recipes.decreaseServingsAriaLabel}
                          size="small"
                          onClick={() =>
                            setTargetServings((current) => {
                              if (current === null || current <= 1) return current
                              return current - 1
                            })
                          }
                          disabled={!canDecreaseServings}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label={t.recipes.increaseServingsAriaLabel}
                          size="small"
                          onClick={() =>
                            setTargetServings((current) => {
                              if (current === null) return recipe.servings
                              return current + 1
                            })
                          }
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}

                    {recipe.tags.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {recipe.tags.map((tag) => (
                          <Chip key={tag.id} size="small" label={tag.name} />
                        ))}
                      </Stack>
                    )}

                    {recipe.sourceUrl && (
                      <Typography variant="body2" sx={{ mt: 1.5 }}>
                        <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                          {recipe.sourceUrl}
                        </a>
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  {t.recipes.ingredientsTitle}
                </Typography>

                {ingredientRows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t.recipes.noIngredients}
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {ingredientRows.map((row) =>
                      row.kind === 'heading' ? (
                        <Typography key={row.id} variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
                          {row.heading || '—'}
                        </Typography>
                        ) : (
                          <Typography key={row.id} variant="body1">
                           • <IngredientRowText row={row} quantityText={scaleQuantityText(row.quantity, servingsScaleFactor)} />
                          </Typography>
                        )
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  {t.recipes.instructionsTitle}
                </Typography>

                {instructionRows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t.recipes.noInstructions}
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {(() => {
                      let stepNumber = 0

                      return instructionRows.map((row, index) => {
                        if (row.kind === 'heading') {
                          stepNumber = 0
                          return (
                            <React.Fragment key={`heading-${index}`}>
                              {index > 0 && <Divider />}
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {row.text || '—'}
                              </Typography>
                            </React.Fragment>
                          )
                        }

                        stepNumber += 1
                        return (
                          <Typography key={`instruction-${index}`} variant="body1">
                            {stepNumber}. {row.text || '—'}
                          </Typography>
                        )
                      })
                    })()}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Container>

      <MobileBottomNav value="recipes" />
    </Box>
  )
}
