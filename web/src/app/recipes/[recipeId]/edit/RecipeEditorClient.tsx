'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useRouter } from 'next/navigation'
import AppTopBar from '@/components/AppTopBar'
import { useT } from '@/i18n/I18nContext'

type RowKind = 'heading' | 'item'

interface IngredientOption {
  id: string
  name: string
}

interface UnitOption {
  id: string
  name: string
}

interface TagOption {
  id: string
  name: string
}

type TagAutocompleteValue = string | TagOption

interface IngredientRowState {
  id: string
  kind: RowKind
  heading: string
  ingredientId: string
  ingredientName: string
  quantity: string
  unitId: string
  unitName: string
  note: string
}

interface InstructionRowState {
  id: string
  kind: RowKind
  text: string
}

interface CookbookOption {
  id: string
  name: string
}

interface RecipeEditorClientProps {
  recipeId: string
}

type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function moveRow<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= rows.length) return rows
  const next = [...rows]
  const tmp = next[index]
  next[index] = next[target]
  next[target] = tmp
  return next
}

export default function RecipeEditorClient({ recipeId }: RecipeEditorClientProps) {
  const router = useRouter()
  const { t, locale } = useT()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [cookbookId, setCookbookId] = useState('')
  const [cookbooks, setCookbooks] = useState<CookbookOption[]>([])
  const [servings, setServings] = useState('')
  const [prepMinutes, setPrepMinutes] = useState('')
  const [cookMinutes, setCookMinutes] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string | null>(null)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const [imageHeight, setImageHeight] = useState<number | null>(null)
  const [imageSizeBytes, setImageSizeBytes] = useState<number | null>(null)

  const [tagOptions, setTagOptions] = useState<TagOption[]>([])
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([])

  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([])
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([])

  const [ingredientRows, setIngredientRows] = useState<IngredientRowState[]>([])
  const [instructionRows, setInstructionRows] = useState<InstructionRowState[]>([])

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved')
  const [baseline, setBaseline] = useState('')

  const snapshot = useMemo(
    () => JSON.stringify({
      title,
      cookbookId,
      servings,
      prepMinutes,
      cookMinutes,
      sourceUrl,
      imagePath,
      imageMimeType,
      imageWidth,
      imageHeight,
      imageSizeBytes,
      tags: selectedTags,
      ingredientRows,
      instructionRows,
    }),
    [
      title,
      cookbookId,
      servings,
      prepMinutes,
      cookMinutes,
      sourceUrl,
      imagePath,
      imageMimeType,
      imageWidth,
      imageHeight,
      imageSizeBytes,
      selectedTags,
      ingredientRows,
      instructionRows,
    ]
  )

  const hasUnsavedChanges = !loading && baseline !== snapshot

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [recipeRes, cookbooksRes] = await Promise.all([
          fetch(`/api/recipes/${recipeId}`),
          fetch('/api/cookbooks?sortBy=name&order=asc'),
        ])

        const recipeData = await recipeRes.json()
        const cookbooksData = await cookbooksRes.json()

        if (!recipeRes.ok || !cookbooksRes.ok) {
          if (active) setError(t.recipes.errors.loadFailed)
          return
        }

        if (!active) return

        setCookbooks((cookbooksData.cookbooks ?? []).map((cb: { id: string; name: string }) => ({ id: cb.id, name: cb.name })))

        const recipe = recipeData.recipe as {
          title: string
          cookbook?: { id: string }
          servings: number | null
          prepMinutes: number | null
          cookMinutes: number | null
          sourceUrl: string | null
          imagePath: string | null
          imageMimeType: string | null
          imageWidth: number | null
          imageHeight: number | null
          imageSizeBytes: number | null
          tags: TagOption[]
          ingredientRows: Array<{
            id: string
            kind: RowKind
            heading: string | null
            ingredient: { id: string; name: string } | null
            quantity: string | null
            unit: { id: string; name: string } | null
            note: string | null
          }>
          instructions: Array<{ kind: RowKind; text: string }>
        }

        const nextTitle = recipe.title
        const nextCookbookId = recipe.cookbook?.id ?? ''
        const nextServings = recipe.servings === null ? '' : String(recipe.servings)
        const nextPrepMinutes = recipe.prepMinutes === null ? '' : String(recipe.prepMinutes)
        const nextCookMinutes = recipe.cookMinutes === null ? '' : String(recipe.cookMinutes)
        const nextSourceUrl = recipe.sourceUrl ?? ''
        const nextImagePath = recipe.imagePath ?? null
        const nextImageMimeType = recipe.imageMimeType ?? null
        const nextImageWidth = recipe.imageWidth ?? null
        const nextImageHeight = recipe.imageHeight ?? null
        const nextImageSizeBytes = recipe.imageSizeBytes ?? null
        const nextSelectedTags = recipe.tags ?? []
        const nextIngredientRows = recipe.ingredientRows.map((row) => ({
          id: row.id,
          kind: row.kind,
          heading: row.heading ?? '',
          ingredientId: row.ingredient?.id ?? '',
          ingredientName: row.ingredient?.name ?? '',
          quantity: row.quantity ?? '',
          unitId: row.unit?.id ?? '',
          unitName: row.unit?.name ?? '',
          note: row.note ?? '',
        }))
        const nextInstructionRows = recipe.instructions.map((row) => ({
          id: uid('instruction'),
          kind: row.kind,
          text: row.text,
        }))

        setTitle(nextTitle)
        setCookbookId(nextCookbookId)
        setServings(nextServings)
        setPrepMinutes(nextPrepMinutes)
        setCookMinutes(nextCookMinutes)
        setSourceUrl(nextSourceUrl)

        setImagePath(nextImagePath)
        setImageMimeType(nextImageMimeType)
        setImageWidth(nextImageWidth)
        setImageHeight(nextImageHeight)
        setImageSizeBytes(nextImageSizeBytes)

        setSelectedTags(nextSelectedTags)

        setIngredientRows(nextIngredientRows)
        setInstructionRows(nextInstructionRows)

        setBaseline(
          JSON.stringify({
            title: nextTitle,
            cookbookId: nextCookbookId,
            servings: nextServings,
            prepMinutes: nextPrepMinutes,
            cookMinutes: nextCookMinutes,
            sourceUrl: nextSourceUrl,
            imagePath: nextImagePath,
            imageMimeType: nextImageMimeType,
            imageWidth: nextImageWidth,
            imageHeight: nextImageHeight,
            imageSizeBytes: nextImageSizeBytes,
            tags: nextSelectedTags,
            ingredientRows: nextIngredientRows,
            instructionRows: nextInstructionRows,
          })
        )
        setAutosaveStatus('saved')
      } catch {
        if (active) setError(t.recipes.errors.loadFailed)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [recipeId, t.recipes.errors.loadFailed])

  useEffect(() => {
    if (!hasUnsavedChanges || submitting || loading) {
      return
    }

    const timer = window.setTimeout(async () => {
      setAutosaveStatus('saving')
      try {
        const res = await fetch(`/api/recipes/${recipeId}/autosave`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
        if (!res.ok) {
          setAutosaveStatus('error')
          return
        }
        setBaseline(snapshot)
        setAutosaveStatus('saved')
      } catch {
        setAutosaveStatus('error')
      }
    }, 800)

    return () => window.clearTimeout(timer)
  }, [hasUnsavedChanges, recipeId, snapshot, submitting, loading])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [hasUnsavedChanges])

  async function loadTagOptions(query: string) {
    const res = await fetch(`/api/recipe-tags?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    if (!res.ok) return
    setTagOptions((data.tags ?? []) as TagOption[])
  }

  async function loadIngredientOptions(query: string) {
    const res = await fetch(`/api/ingredients?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`)
    const data = await res.json()
    if (!res.ok) return
    setIngredientOptions((data.ingredients ?? []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })))
  }

  async function loadUnitOptions(query: string) {
    const res = await fetch(`/api/units?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    if (!res.ok) return
    setUnitOptions((data.units ?? []) as UnitOption[])
  }

  async function createTag(name: string): Promise<TagOption | null> {
    const res = await fetch('/api/recipe-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) return null
    return data.tag as TagOption
  }

  async function createIngredient(name: string): Promise<IngredientOption | null> {
    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, locale }),
    })
    const data = await res.json()
    if (!res.ok) return null
    const ingredient = data.ingredient as { id: string; name: string }
    return { id: ingredient.id, name: ingredient.name }
  }

  async function createUnit(name: string): Promise<UnitOption | null> {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) return null
    return data.unit as UnitOption
  }

  async function ensureIngredientIdsForSubmit(): Promise<IngredientRowState[] | null> {
    const nextRows: IngredientRowState[] = []

    for (const row of ingredientRows) {
      if (row.kind !== 'item') {
        nextRows.push(row)
        continue
      }

      const typedName = row.ingredientName.trim()

      if (row.ingredientId || !typedName) {
        nextRows.push(row)
        continue
      }

      const created = await createIngredient(typedName)
      if (!created) {
        setSaveError(t.recipes.errors.saveFailed)
        return null
      }

      nextRows.push({
        ...row,
        ingredientId: created.id,
        ingredientName: created.name,
      })
    }

    return nextRows
  }

  function buildPayload() {
    return {
      title: title.trim(),
      cookbookId: cookbookId || null,
      servings: servings === '' ? null : Number(servings),
      prepMinutes: prepMinutes === '' ? null : Number(prepMinutes),
      cookMinutes: cookMinutes === '' ? null : Number(cookMinutes),
      sourceUrl: sourceUrl.trim() || null,
      tags: selectedTags.map((tag) => tag.name),
      instructions: instructionRows.map((row) => ({
        kind: row.kind,
        text: row.text,
      })),
      ingredientRows: ingredientRows.map((row) => ({
        kind: row.kind,
        heading: row.kind === 'heading' ? row.heading : undefined,
        ingredientId: row.kind === 'item' ? row.ingredientId || undefined : undefined,
        quantity: row.kind === 'item' ? row.quantity || undefined : undefined,
        unitId: row.kind === 'item' ? row.unitId || undefined : undefined,
        note: row.kind === 'item' ? row.note || undefined : undefined,
      })),
      imagePath,
      imageMimeType,
      imageWidth,
      imageHeight,
      imageSizeBytes,
    }
  }

  async function submitRecipe(publish: boolean) {
    setSaveError('')
    const trimmedTitle = title.trim()

    if (publish && !trimmedTitle) {
      setSaveError(t.recipes.errors.titleRequired)
      return
    }
    if (trimmedTitle.length > 500) {
      setSaveError(t.recipes.errors.titleMaxLength)
      return
    }

    if (instructionRows.some((row) => row.kind === 'item' && row.text.length > 10_000)) {
      setSaveError(t.recipes.errors.instructionItemMaxLength)
      return
    }

    const resolvedIngredientRows = await ensureIngredientIdsForSubmit()
    if (!resolvedIngredientRows) {
      return
    }

    setIngredientRows(resolvedIngredientRows)

    setSubmitting(true)
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildPayload(),
          ingredientRows: resolvedIngredientRows.map((row) => ({
            kind: row.kind,
            heading: row.kind === 'heading' ? row.heading : undefined,
            ingredientId: row.kind === 'item' ? row.ingredientId || undefined : undefined,
            quantity: row.kind === 'item' ? row.quantity || undefined : undefined,
            unitId: row.kind === 'item' ? row.unitId || undefined : undefined,
            note: row.kind === 'item' ? row.note || undefined : undefined,
          })),
          publish,
        }),
      })
      if (!res.ok) {
        setSaveError(publish ? t.recipes.errors.publishFailed : t.recipes.errors.saveFailed)
        return
      }
      setBaseline(snapshot)
      setAutosaveStatus('saved')
      router.push('/recipes')
    } catch {
      setSaveError(publish ? t.recipes.errors.publishFailed : t.recipes.errors.saveFailed)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleImageUpload(file: File) {
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch('/api/recipes/image', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (!res.ok) {
      setSaveError(t.recipes.errors.imageUploadFailed)
      return
    }

    const image = data.image as {
      path: string
      mimeType: string
      width: number | null
      height: number | null
      sizeBytes: number | null
    }

    setImagePath(image.path)
    setImageMimeType(image.mimeType)
    setImageWidth(image.width)
    setImageHeight(image.height)
    setImageSizeBytes(image.sizeBytes)
  }

  function tryBackToRecipes() {
    if (hasUnsavedChanges && !window.confirm(t.recipes.unsavedChangesPrompt)) {
      return
    }
    router.push('/recipes')
  }

  async function createCookbookInline() {
    const name = window.prompt(t.cookbooks.nameLabel) ?? ''
    const trimmed = name.trim()
    if (!trimmed) {
      setSaveError(t.recipes.errors.cookbookRequired)
      return
    }
    if (trimmed.length > 500) {
      setSaveError(t.recipes.errors.cookbookMaxLength)
      return
    }

    const res = await fetch('/api/cookbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })

    if (res.status === 409) {
      setSaveError(t.recipes.errors.cookbookDuplicate)
      return
    }

    const data = await res.json()
    if (!res.ok) {
      setSaveError(t.recipes.errors.cookbookCreateFailed)
      return
    }

    const created = data.cookbook as CookbookOption
    setCookbooks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setCookbookId(created.id)
  }

  const autosaveLabel =
    autosaveStatus === 'saving'
      ? t.recipes.autosaveSaving
      : autosaveStatus === 'unsaved'
        ? t.recipes.autosaveUnsaved
        : autosaveStatus === 'error'
          ? t.recipes.autosaveError
          : t.recipes.autosaveSaved

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button onClick={tryBackToRecipes} sx={{ mb: 2 }}>
          {t.recipes.backToRecipes}
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.recipes.editorTitleCreate}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t.recipes.editorSubtitle}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        <Card elevation={0} sx={{ mb: 2 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label={t.recipes.titleLabel}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Select
                    fullWidth
                    value={cookbookId}
                    displayEmpty
                    onChange={(event) => setCookbookId(String(event.target.value))}
                  >
                    <MenuItem value="">{t.recipes.noCookbookOption}</MenuItem>
                    {cookbooks.map((cookbook) => (
                      <MenuItem key={cookbook.id} value={cookbook.id}>
                        {cookbook.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Button variant="outlined" onClick={createCookbookInline}>
                  {t.recipes.createCookbookButton}
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  label={t.recipes.servingsLabel}
                  value={servings}
                  type="number"
                  onChange={(event) => setServings(event.target.value)}
                />
                <TextField
                  label={t.recipes.prepMinutesLabel}
                  value={prepMinutes}
                  type="number"
                  onChange={(event) => setPrepMinutes(event.target.value)}
                />
                <TextField
                  label={t.recipes.cookMinutesLabel}
                  value={cookMinutes}
                  type="number"
                  onChange={(event) => setCookMinutes(event.target.value)}
                />
              </Box>

              <TextField
                label={t.recipes.sourceUrlLabel}
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />

              <Autocomplete<TagOption, true, false, true>
                options={tagOptions}
                multiple
                freeSolo
                value={selectedTags}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                filterSelectedOptions
                isOptionEqualToValue={(option, value) =>
                  typeof value !== 'string' && option.id === value.id
                }
                onInputChange={(_, value) => {
                  setTagInput(value)
                  void loadTagOptions(value)
                }}
                onChange={async (_, value) => {
                  const resolved: TagOption[] = []
                  for (const option of value) {
                    if (typeof option === 'string') {
                      const created = await createTag(option)
                      if (created) resolved.push(created)
                    } else {
                      resolved.push(option)
                    }
                  }
                  setSelectedTags(resolved)
                }}
                renderValue={(value: readonly TagAutocompleteValue[], getTagProps) =>
                  value.map((option: TagAutocompleteValue, index: number) => {
                    const label = typeof option === 'string' ? option : option.name
                    const key = typeof option === 'string' ? `${option}-${index}` : option.id
                    return <Chip {...getTagProps({ index })} key={key} label={label} />
                  })
                }
                renderInput={(params) => <TextField {...params} label={t.recipes.tagsLabel} />}
                inputValue={tagInput}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t.recipes.imageLabel}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button component="label" variant="outlined">
                    {t.recipes.imageUploadButton}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          void handleImageUpload(file)
                        }
                        event.currentTarget.value = ''
                      }}
                    />
                  </Button>
                  <Button component="label" variant="outlined">
                    {t.recipes.imageCaptureButton}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          void handleImageUpload(file)
                        }
                        event.currentTarget.value = ''
                      }}
                    />
                  </Button>
                </Stack>
                {imagePath && (
                  <Box>
                    <img src={imagePath} alt={t.recipes.imageLabel} style={{ maxWidth: '100%', borderRadius: 8 }} />
                  </Box>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t.recipes.ingredientsTitle}
            </Typography>

            <Stack spacing={2}>
              {ingredientRows.map((row, index) => (
                <Box key={row.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent: 'space-between' }}>
                    <Select
                      size="small"
                      value={row.kind}
                      onChange={(event) => {
                        const kind = event.target.value as RowKind
                        setIngredientRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, kind } : item)))
                      }}
                    >
                      <MenuItem value="item">{t.recipes.rowKindItem}</MenuItem>
                      <MenuItem value="heading">{t.recipes.rowKindHeading}</MenuItem>
                    </Select>

                    <Box>
                      <IconButton size="small" onClick={() => setIngredientRows((prev) => moveRow(prev, index, -1))}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setIngredientRows((prev) => moveRow(prev, index, 1))}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setIngredientRows((prev) => prev.filter((item) => item.id !== row.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>

                  {row.kind === 'heading' ? (
                    <TextField
                      fullWidth
                      label={t.recipes.ingredientHeadingLabel}
                      value={row.heading}
                      onChange={(event) => {
                        const value = event.target.value
                        setIngredientRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, heading: value } : item)))
                      }}
                    />
                  ) : (
                    <Stack spacing={1}>
                      <Autocomplete
                        options={ingredientOptions}
                        freeSolo
                        getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                        isOptionEqualToValue={(option, value) =>
                          typeof value !== 'string' && option.id === value.id
                        }
                        value={row.ingredientName || null}
                        onInputChange={(_, value) => {
                          void loadIngredientOptions(value)
                          setIngredientRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, ingredientName: value, ingredientId: '' }
                                : item
                            )
                          )
                        }}
                        onChange={async (_, value) => {
                          if (typeof value === 'string') {
                            const created = await createIngredient(value)
                            if (created) {
                              setIngredientRows((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, ingredientId: created.id, ingredientName: created.name }
                                    : item
                                )
                              )
                            }
                          } else if (value) {
                            setIngredientRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? { ...item, ingredientId: value.id, ingredientName: value.name }
                                  : item
                              )
                            )
                          }
                        }}
                        renderInput={(params) => <TextField {...params} label={t.recipes.ingredientNameLabel} />}
                      />

                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
                        <TextField
                          label={t.recipes.ingredientQuantityLabel}
                          value={row.quantity}
                          onChange={(event) => {
                            const value = event.target.value
                            setIngredientRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, quantity: value } : item)))
                          }}
                        />

                        <Autocomplete
                          options={unitOptions}
                          freeSolo
                          getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                          isOptionEqualToValue={(option, value) =>
                            typeof value !== 'string' && option.id === value.id
                          }
                          value={row.unitName || null}
                          onInputChange={(_, value) => {
                            void loadUnitOptions(value)
                            setIngredientRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, unitName: value, unitId: '' } : item
                              )
                            )
                          }}
                          onChange={async (_, value) => {
                            if (typeof value === 'string') {
                              const created = await createUnit(value)
                              if (created) {
                                setIngredientRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, unitId: created.id, unitName: created.name } : item
                                  )
                                )
                              }
                            } else if (value) {
                              setIngredientRows((prev) =>
                                prev.map((item) =>
                                  item.id === row.id ? { ...item, unitId: value.id, unitName: value.name } : item
                                )
                              )
                            }
                          }}
                          renderInput={(params) => <TextField {...params} label={t.recipes.ingredientUnitLabel} />}
                        />

                        <TextField
                          label={t.recipes.ingredientNoteLabel}
                          value={row.note}
                          onChange={(event) => {
                            const value = event.target.value
                            setIngredientRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, note: value } : item)))
                          }}
                        />
                      </Box>
                    </Stack>
                  )}
                </Box>
              ))}

              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setIngredientRows((prev) => [
                      ...prev,
                      {
                        id: uid('ingredient'),
                        kind: 'item',
                        heading: '',
                        ingredientId: '',
                        ingredientName: '',
                        quantity: '',
                        unitId: '',
                        unitName: '',
                        note: '',
                      },
                    ])
                  }
                >
                  {t.recipes.addIngredientItem}
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setIngredientRows((prev) => [
                      ...prev,
                      {
                        id: uid('ingredient-heading'),
                        kind: 'heading',
                        heading: '',
                        ingredientId: '',
                        ingredientName: '',
                        quantity: '',
                        unitId: '',
                        unitName: '',
                        note: '',
                      },
                    ])
                  }
                >
                  {t.recipes.addIngredientHeading}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t.recipes.instructionsTitle}
            </Typography>

            <Stack spacing={2}>
              {instructionRows.map((row, index) => (
                <Box key={row.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent: 'space-between' }}>
                    <Select
                      size="small"
                      value={row.kind}
                      onChange={(event) => {
                        const kind = event.target.value as RowKind
                        setInstructionRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, kind } : item)))
                      }}
                    >
                      <MenuItem value="item">{t.recipes.rowKindItem}</MenuItem>
                      <MenuItem value="heading">{t.recipes.rowKindHeading}</MenuItem>
                    </Select>

                    <Box>
                      <IconButton size="small" onClick={() => setInstructionRows((prev) => moveRow(prev, index, -1))}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setInstructionRows((prev) => moveRow(prev, index, 1))}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setInstructionRows((prev) => prev.filter((item) => item.id !== row.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>

                  <TextField
                    fullWidth
                    multiline
                    minRows={row.kind === 'heading' ? 1 : 3}
                    label={t.recipes.instructionTextLabel}
                    value={row.text}
                    onChange={(event) => {
                      const value = event.target.value
                      setInstructionRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, text: value } : item)))
                    }}
                    slotProps={{ htmlInput: { maxLength: row.kind === 'item' ? 10_000 : 500 } }}
                  />
                </Box>
              ))}

              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setInstructionRows((prev) => [...prev, { id: uid('instruction-item'), kind: 'item', text: '' }])
                  }
                >
                  {t.recipes.addInstructionItem}
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setInstructionRows((prev) => [...prev, { id: uid('instruction-heading'), kind: 'heading', text: '' }])
                  }
                >
                  {t.recipes.addInstructionHeading}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color={autosaveStatus === 'error' ? 'error.main' : 'text.secondary'}>
            {autosaveLabel}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" disabled={submitting} onClick={() => void submitRecipe(false)}>
              {t.recipes.saveDraftButton}
            </Button>
            <Button variant="contained" disabled={submitting} onClick={() => void submitRecipe(true)}>
              {t.recipes.publishButton}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}
