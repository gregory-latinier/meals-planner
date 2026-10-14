import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  Autocomplete,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Chip,
  Stack,
  Divider,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RemoveIcon from '@mui/icons-material/Remove'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { useNavigate } from 'react-router-dom'

import AppTopBar from '../components/AppTopBar'
import MobileBottomNav from '../components/MobileBottomNav'
import { useT } from '../i18n/I18nContext'
import { useRealtime } from '../hooks/useRealtime'
import { MealPlanItemWithRecipe, MealType } from '../types/models'
import {
  fetchMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
} from '../api/meal-plans'
import { formatLocalDate, getMonday } from '../lib/date-utils'
import { scaleQuantityText } from '../lib/recipe-quantity-scaling'

export type MealPlanItemData = MealPlanItemWithRecipe

interface RecipeOption {
  id: string
  title: string
  servings?: number | null
}

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

const STORAGE_DATE_KEY = 'mp_meal_plan_date'
const STORAGE_VIEW_KEY = 'mp_meal_plan_view'

function getInitialDate(): Date {
  try {
    const stored = window.localStorage.getItem(STORAGE_DATE_KEY)
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      const [y, m, d] = stored.split('-').map(Number)
      const parsed = new Date(y, m - 1, d)
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0)
        return parsed
      }
    }
  } catch {
    // ignore
  }
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getInitialView(): 'week' | 'month' {
  try {
    const stored = window.localStorage.getItem(STORAGE_VIEW_KEY)
    if (stored === 'week' || stored === 'month') {
      return stored
    }
  } catch {
    // ignore
  }
  return 'week'
}

interface DetailedRecipeView {
  id: string
  title: string
  status: 'draft' | 'published'
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

function formatTemplate(template: string, value: string | number): string {
  return template.replace('{{value}}', String(value))
}

function RecipeThumbnail({
  src,
  alt,
  size = 52,
  borderRadius = 1.5,
  iconSize = 'small',
}: {
  src?: string | null
  alt: string
  size?: number
  borderRadius?: number | string
  iconSize?: 'small' | 'medium' | 'inherit'
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const isFailed = Boolean(src && failedSrc === src)

  if (!src || isFailed) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        <RestaurantIcon fontSize={iconSize} />
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
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius,
        objectFit: 'cover',
        display: 'block',
      }}
    />
  )
}

function ModalHeaderImage({ src, alt, fallbackLabel }: { src: string | null; alt: string; fallbackLabel: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = Boolean(src && failedSrc === src)

  if (!src || broken) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: 180,
          bgcolor: 'action.hover',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        <RestaurantIcon sx={{ fontSize: 44, opacity: 0.6 }} />
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
        maxHeight: 280,
        objectFit: 'cover',
        borderRadius: 2,
        display: 'block',
      }}
    />
  )
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

export default function MealPlanPage() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'week' | 'month'>(getInitialView)
  const [currentDate, setCurrentDate] = useState<Date>(getInitialDate)

  const [items, setItems] = useState<MealPlanItemData[]>([])
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [defaultServings, setDefaultServings] = useState<number>(4)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null)

  // Drag-and-drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const wasDraggedRef = useRef(false)
  const scrollAnimFrameRef = useRef<number | null>(null)
  const scrollVelocityRef = useRef<number>(0)

  // Add / Edit Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MealPlanItemData | null>(null)
  const [itemType, setItemType] = useState<'recipe' | 'custom'>('recipe')
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeOption | null>(null)
  const [customTitle, setCustomTitle] = useState<string>('')
  const [mealType, setMealType] = useState<MealType>('dinner')
  const [servings, setServings] = useState<string>('4')
  const [planDate, setPlanDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<MealPlanItemData | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Recipe View Dialog state
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null)
  const [viewingRecipe, setViewingRecipe] = useState<DetailedRecipeView | null>(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [targetServings, setTargetServings] = useState<number | null>(null)

  // Date range computations
  const weekStart = useMemo(() => getMonday(currentDate), [currentDate])
  const weekStartDateStr = useMemo(() => formatLocalDate(weekStart), [weekStart])

  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }, [weekStart])

  const monthRange = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Calendar grid start (Monday before or on firstDay)
    const startCal = getMonday(firstDay)
    // Calendar grid end (Sunday after or on lastDay)
    const endCal = new Date(lastDay)
    const endDayOfWeek = endCal.getDay()
    const diff = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek
    endCal.setDate(endCal.getDate() + diff)

    return {
      firstDay,
      lastDay,
      startDateStr: formatLocalDate(startCal),
      endDateStr: formatLocalDate(endCal),
      startCal,
      endCal,
    }
  }, [currentDate])

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes?status=PUBLISHED')
      if (res.ok) {
        const data = await res.json()
        setRecipes(
          (data.recipes || []).map((r: { id: string; title: string; servings?: number | null }) => ({
            id: r.id,
            title: r.title,
            servings: r.servings,
          }))
        )
      }
    } catch {
      // ignore
    }
  }, [])

  const loadGeneralSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/general')
      if (res.ok) {
        const data = await res.json()
        if (typeof data.defaultMealPlanServings === 'number' && data.defaultMealPlanServings > 0) {
          setDefaultServings(data.defaultMealPlanServings)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const loadMealPlans = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let data: MealPlanItemWithRecipe[]
      if (viewMode === 'week') {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        data = await fetchMealPlans({
          startDate: weekStartDateStr,
          endDate: formatLocalDate(weekEnd),
        })
      } else {
        data = await fetchMealPlans({
          startDate: monthRange.startDateStr,
          endDate: monthRange.endDateStr,
        })
      }
      setItems(data)
    } catch {
      setErrorMsg(t.mealPlan.errors.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [viewMode, weekStart, weekStartDateStr, monthRange, t])

  useEffect(() => {
    loadRecipes()
    loadGeneralSettings()
  }, [loadRecipes, loadGeneralSettings])

  useEffect(() => {
    loadMealPlans()
  }, [loadMealPlans])

  // Persist viewMode and currentDate
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_VIEW_KEY, viewMode)
    } catch {
      // ignore
    }
  }, [viewMode])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_DATE_KEY, formatLocalDate(currentDate))
    } catch {
      // ignore
    }
  }, [currentDate])

  // Realtime hook
  useRealtime(
    useCallback(
      (data: { type: string; payload: unknown }) => {
        if (data.type.startsWith('meal_plan:')) {
          loadMealPlans()
        }
      },
      [loadMealPlans]
    )
  )

  // Auto-scroll window while dragging near edges
  useEffect(() => {
    if (!draggedItemId) {
      if (scrollAnimFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimFrameRef.current)
        scrollAnimFrameRef.current = null
      }
      scrollVelocityRef.current = 0
      return
    }

    const startScrollLoop = () => {
      if (scrollAnimFrameRef.current !== null) return
      const tick = () => {
        if (scrollVelocityRef.current !== 0) {
          window.scrollBy(0, scrollVelocityRef.current)
          scrollAnimFrameRef.current = requestAnimationFrame(tick)
        } else {
          scrollAnimFrameRef.current = null
        }
      }
      scrollAnimFrameRef.current = requestAnimationFrame(tick)
    }

    const handleWindowDragOver = (e: DragEvent) => {
      // Must preventDefault so dragover is recognized
      const y = e.clientY
      const viewportHeight = window.innerHeight
      const edgeThreshold = 120
      const maxSpeed = 22

      if (y < edgeThreshold) {
        // Near top of viewport -> scroll up
        const intensity = (edgeThreshold - y) / edgeThreshold
        scrollVelocityRef.current = -Math.max(4, Math.round(intensity * maxSpeed))
        startScrollLoop()
      } else if (y > viewportHeight - edgeThreshold) {
        // Near bottom of viewport -> scroll down
        const intensity = (y - (viewportHeight - edgeThreshold)) / edgeThreshold
        scrollVelocityRef.current = Math.max(4, Math.round(intensity * maxSpeed))
        startScrollLoop()
      } else {
        scrollVelocityRef.current = 0
      }
    }

    const stopScroll = () => {
      scrollVelocityRef.current = 0
      if (scrollAnimFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimFrameRef.current)
        scrollAnimFrameRef.current = null
      }
    }

    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('dragend', stopScroll)
    window.addEventListener('drop', stopScroll)

    return () => {
      stopScroll()
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('dragend', stopScroll)
      window.removeEventListener('drop', stopScroll)
    }
  }, [draggedItemId])

  // Navigation handlers
  function handlePrev() {
    if (viewMode === 'week') {
      const prev = new Date(currentDate)
      prev.setDate(prev.getDate() - 7)
      setCurrentDate(prev)
    } else {
      const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      setCurrentDate(prev)
    }
  }

  function handleNext() {
    if (viewMode === 'week') {
      const next = new Date(currentDate)
      next.setDate(next.getDate() + 7)
      setCurrentDate(next)
    } else {
      const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      setCurrentDate(next)
    }
  }

  function handleToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setCurrentDate(today)
  }

  // Open modal for new item
  function handleOpenAdd(defaultDateStr?: string) {
    setEditingItem(null)
    setItemType('recipe')
    setSelectedRecipe(null)
    setCustomTitle('')
    setMealType('dinner')
    setServings(String(defaultServings))
    setPlanDate(defaultDateStr || formatLocalDate(currentDate))
    setNotes('')
    setDialogOpen(true)
  }

  // Open modal for editing item
  function handleOpenEdit(item: MealPlanItemData) {
    setEditingItem(item)
    if (item.recipeId) {
      setItemType('recipe')
      const r = recipes.find((x) => x.id === item.recipeId)
      setSelectedRecipe(r || { id: item.recipeId, title: item.title })
    } else {
      setItemType('custom')
      setSelectedRecipe(null)
    }
    setCustomTitle(item.title)
    setMealType(item.mealType || 'dinner')
    setServings(item.servings != null ? String(item.servings) : '')
    setPlanDate(item.date || '')
    setNotes(item.notes || '')
    setDialogOpen(true)
  }

  // Handle clicking on a meal card
  function handleCardClick(item: MealPlanItemData) {
    if (wasDraggedRef.current) return
    if (item.recipeId) {
      handleOpenRecipe(item.recipeId, item.servings)
    } else {
      handleOpenEdit(item)
    }
  }

  // Fetch and open recipe dialog
  async function handleOpenRecipe(recipeId: string, initialServings?: number | null) {
    setViewingRecipeId(recipeId)
    setViewingRecipe(null)
    setRecipeError(null)
    setRecipeLoading(true)
    setRecipeDialogOpen(true)

    try {
      const res = await fetch(`/api/recipes/${recipeId}`)
      if (!res.ok) {
        setRecipeError(t.recipes.errors.viewLoadFailed)
        return
      }
      const data = await res.json()
      const loadedRecipe = (data.recipe ?? null) as DetailedRecipeView | null
      setViewingRecipe(loadedRecipe)
      setTargetServings(initialServings ?? loadedRecipe?.servings ?? null)
    } catch {
      setRecipeError(t.recipes.errors.viewLoadFailed)
    } finally {
      setRecipeLoading(false)
    }
  }

  function handleCloseRecipeDialog() {
    setRecipeDialogOpen(false)
    setViewingRecipeId(null)
    setViewingRecipe(null)
    setRecipeError(null)
  }

  // Save item (create or update)
  async function handleSave() {
    const title = itemType === 'recipe' ? selectedRecipe?.title : customTitle.trim()
    if (!title) {
      setErrorMsg(t.mealPlan.errors.titleRequired)
      return
    }

    const payloadDate = planDate.trim() ? planDate.trim() : null
    let itemWeekStart = weekStartDateStr
    if (payloadDate) {
      const [y, m, d] = payloadDate.split('-').map(Number)
      itemWeekStart = formatLocalDate(getMonday(new Date(y, m - 1, d)))
    }

    const payload = {
      title,
      recipeId: itemType === 'recipe' ? selectedRecipe?.id || null : null,
      date: payloadDate,
      weekStartDate: itemWeekStart,
      mealType,
      servings: servings.trim() ? parseInt(servings.trim(), 10) : null,
      notes: notes.trim() ? notes.trim() : null,
    }

    try {
      if (editingItem) {
        await updateMealPlan(editingItem.id, payload)
      } else {
        await createMealPlan(payload)
      }
      setDialogOpen(false)
      loadMealPlans()
    } catch {
      setErrorMsg(t.mealPlan.errors.saveFailed)
    }
  }

  // Drag and drop handlers
  async function handleDropOnDate(targetDate: string) {
    if (!draggedItemId) return
    const item = items.find((i) => i.id === draggedItemId)
    if (!item) return
    if (item.date === targetDate) {
      setDraggedItemId(null)
      setDragOverTarget(null)
      return
    }

    const previousItems = items
    const [y, m, d] = targetDate.split('-').map(Number)
    const targetWeekStart = formatLocalDate(getMonday(new Date(y, m - 1, d)))

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === draggedItemId
          ? { ...i, date: targetDate, weekStartDate: targetWeekStart }
          : i
      )
    )
    setDraggedItemId(null)
    setDragOverTarget(null)

    try {
      await updateMealPlan(item.id, {
        date: targetDate,
        weekStartDate: targetWeekStart,
      })
    } catch {
      setItems(previousItems)
      setErrorMsg(t.mealPlan.errors.saveFailed)
    }
  }

  async function handleDropOnUnassigned() {
    if (!draggedItemId) return
    const item = items.find((i) => i.id === draggedItemId)
    if (!item) return
    if (item.date === null || item.date === undefined) {
      setDraggedItemId(null)
      setDragOverTarget(null)
      return
    }

    const previousItems = items
    const targetWeekStart = weekStartDateStr

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === draggedItemId
          ? { ...i, date: null, weekStartDate: targetWeekStart }
          : i
      )
    )
    setDraggedItemId(null)
    setDragOverTarget(null)

    try {
      await updateMealPlan(item.id, {
        date: null,
        weekStartDate: targetWeekStart,
      })
    } catch {
      setItems(previousItems)
      setErrorMsg(t.mealPlan.errors.saveFailed)
    }
  }

  // Delete item
  function handleOpenDelete(item: MealPlanItemData) {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  function handleCloseDelete() {
    if (deleting) return
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return
    try {
      setDeleting(true)
      await deleteMealPlan(itemToDelete.id)
      handleCloseDelete()
      loadMealPlans()
    } catch {
      setErrorMsg(t.mealPlan.errors.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  // Format header display
  const titleRangeLabel = useMemo(() => {
    if (viewMode === 'week') {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      const startStr = weekStart.toLocaleDateString(locale, options)
      const endStr = weekEnd.toLocaleDateString(locale, { ...options, year: 'numeric' })
      return `${startStr} – ${endStr}`
    } else {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    }
  }, [viewMode, weekStart, currentDate, locale])

  // Group items by date for week view
  const weekItemsByDate = useMemo(() => {
    const map: Record<string, MealPlanItemData[]> = {}
    weekDays.forEach((d) => {
      map[formatLocalDate(d)] = []
    })
    const unassigned: MealPlanItemData[] = []

    items.forEach((item) => {
      if (item.date && map[item.date]) {
        map[item.date].push(item)
      } else if (!item.date) {
        unassigned.push(item)
      }
    })

    return { map, unassigned }
  }, [items, weekDays])

  // Month calendar days
  const monthCalendarDays = useMemo(() => {
    const days: Date[] = []
    const current = new Date(monthRange.startCal)
    while (current <= monthRange.endCal) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [monthRange])

  const monthItemsByDate = useMemo(() => {
    const map: Record<string, MealPlanItemData[]> = {}
    items.forEach((item) => {
      if (item.date) {
        if (!map[item.date]) map[item.date] = []
        map[item.date].push(item)
      }
    })
    return map
  }, [items])

  function getMealTypeLabel(typeKey: string) {
    const m = t.mealPlan.mealTypes as Record<string, string>
    return m[typeKey] || typeKey
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 10, md: 4 } }}>
      <AppTopBar />

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header & Controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 3,
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {t.mealPlan.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.mealPlan.subtitle}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={viewMode === 'week' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('week')}
              >
                {t.mealPlan.weekView}
              </Button>
              <Button
                variant={viewMode === 'month' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('month')}
              >
                {t.mealPlan.monthView}
              </Button>
            </ButtonGroup>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAdd()}
            >
              {t.mealPlan.addMeal}
            </Button>
          </Box>
        </Box>

        {/* Date Selector Navigation */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={handlePrev}
              size="small"
              aria-label={viewMode === 'week' ? t.mealPlan.previousWeek : t.mealPlan.previousMonth}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={handleToday} size="small" aria-label={t.mealPlan.today}>
              <TodayIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              size="small"
              aria-label={viewMode === 'week' ? t.mealPlan.nextWeek : t.mealPlan.nextMonth}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {titleRangeLabel}
          </Typography>

          <Box sx={{ width: 40 }} />
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : viewMode === 'week' ? (
          /* WEEK VIEW */
          <Box>
            <Grid container spacing={2}>
              {weekDays.map((day) => {
                const dateStr = formatLocalDate(day)
                const isToday = formatLocalDate(new Date()) === dateStr
                const dayItems = weekItemsByDate.map[dateStr] || []
                const dayName = day.toLocaleDateString(locale, { weekday: 'short' })
                const dayNum = day.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' })

                return (
                  <Grid key={dateStr} size={{ xs: 12, sm: 6 }}>
                    <Card
                      variant="outlined"
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragOverTarget !== dateStr) setDragOverTarget(dateStr)
                      }}
                      onDragLeave={() => {
                        if (dragOverTarget === dateStr) setDragOverTarget(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDropOnDate(dateStr)
                      }}
                      sx={{
                        height: '100%',
                        minHeight: dayItems.length === 0 ? 80 : 120,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: dragOverTarget === dateStr
                          ? 'action.selected'
                          : isToday
                          ? 'action.hover'
                          : 'background.paper',
                        borderColor: dragOverTarget === dateStr
                          ? 'primary.main'
                          : isToday
                          ? 'primary.main'
                          : 'divider',
                        borderWidth: dragOverTarget === dateStr ? 2 : 1,
                        borderStyle: dragOverTarget === dateStr ? 'dashed' : 'solid',
                        transition: 'background-color 0.2s, border-color 0.2s',
                      }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          px: 1.25,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: isToday ? 'primary.main' : 'text.primary',
                              textTransform: 'uppercase',
                              fontSize: '0.75rem',
                              lineHeight: 1,
                            }}
                          >
                            {dayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1 }}>
                            {dayNum}
                          </Typography>
                        </Box>

                        <IconButton
                          size="small"
                          onClick={() => handleOpenAdd(dateStr)}
                          title={t.mealPlan.addMeal}
                          aria-label={t.mealPlan.addMeal}
                          sx={{ p: 0.25 }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 }, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {dayItems.length === 0 ? (
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontStyle: 'italic', display: 'block', py: 0.5, textAlign: 'center', fontSize: '0.7rem' }}
                          >
                            {t.mealPlan.emptyDay}
                          </Typography>
                        ) : (
                          dayItems.map((item) => (
                            <Paper
                              key={item.id}
                              variant="outlined"
                              draggable
                              onDragStart={() => {
                                wasDraggedRef.current = true
                                setDraggedItemId(item.id)
                              }}
                              onDragEnd={() => {
                                setDraggedItemId(null)
                                setDragOverTarget(null)
                                setTimeout(() => {
                                  wasDraggedRef.current = false
                                }, 100)
                              }}
                              onClick={() => handleCardClick(item)}
                              sx={{
                                p: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: 'background.default',
                                position: 'relative',
                                cursor: 'pointer',
                                opacity: draggedItemId === item.id ? 0.4 : 1,
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                '&:hover': {
                                  boxShadow: 1,
                                },
                                '&:active': { cursor: 'grabbing' },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, flexGrow: 1, minWidth: 0 }}>
                                  <RecipeThumbnail
                                    src={item.recipeCoverImagePath}
                                    alt={item.title}
                                    size={58}
                                    borderRadius={1.5}
                                  />
                                  <Box sx={{ minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 600,
                                        wordBreak: 'break-word',
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {item.title}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          bgcolor: 'primary.light',
                                          color: 'primary.contrastText',
                                          px: 0.75,
                                          py: 0.1,
                                          borderRadius: 1,
                                          fontSize: '0.65rem',
                                          fontWeight: 600,
                                        }}
                                      >
                                        {getMealTypeLabel(item.mealType)}
                                      </Typography>
                                      {item.servings != null && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                          {item.servings} {t.mealPlan.servingsLabel.toLowerCase()}
                                        </Typography>
                                      )}
                                      {item.recipePrepMinutes != null && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, color: 'text.secondary' }}>
                                          <AccessTimeIcon sx={{ fontSize: '0.75rem' }} />
                                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                            {item.recipePrepMinutes} min
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                    {item.notes && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.7rem' }}
                                      >
                                        {item.notes}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>

                                <Box
                                  sx={{ display: 'flex', alignItems: 'center' }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEdit(item)}
                                    sx={{ p: 0.25 }}
                                    title={t.mealPlan.editMeal}
                                    aria-label={t.mealPlan.editMeal}
                                  >
                                    <EditIcon fontSize="inherit" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDelete(item)}
                                    color="error"
                                    sx={{ p: 0.25 }}
                                    title={t.mealPlan.deleteMeal}
                                    aria-label={t.mealPlan.deleteMeal}
                                  >
                                    <DeleteIcon fontSize="inherit" />
                                  </IconButton>
                                </Box>
                              </Box>
                            </Paper>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>

            {/* Unassigned / Unscheduled Meals */}
            <Box
              sx={{ mt: 4 }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverTarget !== 'unassigned') setDragOverTarget('unassigned')
              }}
              onDragLeave={() => {
                if (dragOverTarget === 'unassigned') setDragOverTarget(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                handleDropOnUnassigned()
              }}
            >
              <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
                {t.mealPlan.unassignedMeals}
              </Typography>
              {weekItemsByDate.unassigned.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: dragOverTarget === 'unassigned' ? 'primary.main' : 'divider',
                    bgcolor: dragOverTarget === 'unassigned' ? 'action.selected' : 'background.paper',
                    transition: 'background-color 0.2s, border-color 0.2s',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {t.mealPlan.dropHereToUnschedule}
                  </Typography>
                </Paper>
              ) : (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: '2px dashed',
                    borderColor: dragOverTarget === 'unassigned' ? 'primary.main' : 'transparent',
                    bgcolor: dragOverTarget === 'unassigned' ? 'action.selected' : 'transparent',
                    transition: 'background-color 0.2s, border-color 0.2s',
                  }}
                >
                  <Grid container spacing={2}>
                    {weekItemsByDate.unassigned.map((item) => (
                      <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card
                          variant="outlined"
                          draggable
                          onDragStart={() => {
                            wasDraggedRef.current = true
                            setDraggedItemId(item.id)
                          }}
                          onDragEnd={() => {
                            setDraggedItemId(null)
                            setDragOverTarget(null)
                            setTimeout(() => {
                              wasDraggedRef.current = false
                            }, 100)
                          }}
                          onClick={() => handleCardClick(item)}
                          sx={{
                            p: 1.5,
                            cursor: 'pointer',
                            opacity: draggedItemId === item.id ? 0.4 : 1,
                            transition: 'box-shadow 0.15s',
                            '&:hover': { boxShadow: 1 },
                            '&:active': { cursor: 'grabbing' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0, flexGrow: 1 }}>
                              <RecipeThumbnail
                                src={item.recipeCoverImagePath}
                                alt={item.title}
                                size={58}
                                borderRadius={1.5}
                              />
                              <Box sx={{ minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 600,
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {item.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      bgcolor: 'primary.light',
                                      color: 'primary.contrastText',
                                      px: 0.75,
                                      py: 0.1,
                                      borderRadius: 1,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {getMealTypeLabel(item.mealType)}
                                  </Typography>
                                  {item.servings != null && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                      {item.servings} {t.mealPlan.servingsLabel.toLowerCase()}
                                    </Typography>
                                  )}
                                  {item.recipePrepMinutes != null && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, color: 'text.secondary' }}>
                                      <AccessTimeIcon sx={{ fontSize: '0.75rem' }} />
                                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                        {item.recipePrepMinutes} min
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                {item.notes && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.7rem' }}
                                  >
                                    {item.notes}
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            <Box
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ display: 'flex', alignItems: 'center' }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(item)}
                                aria-label={t.mealPlan.editMeal}
                                title={t.mealPlan.editMeal}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenDelete(item)}
                                aria-label={t.mealPlan.deleteMeal}
                                title={t.mealPlan.deleteMeal}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          /* MONTH VIEW */
          <Box>
            <Grid container spacing={1}>
              {/* Day headers Mon-Sun */}
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((_, idx) => {
                const sampleDay = new Date(2026, 9, 12 + idx) // 2026-10-12 is Monday
                return (
                  <Grid key={idx} size={{ xs: 12 / 7 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'center',
                        fontWeight: 700,
                        py: 1,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                      }}
                    >
                      {sampleDay.toLocaleDateString(locale, { weekday: 'short' })}
                    </Typography>
                  </Grid>
                )
              })}

              {monthCalendarDays.map((day) => {
                const dateStr = formatLocalDate(day)
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const isToday = formatLocalDate(new Date()) === dateStr
                const dayItems = monthItemsByDate[dateStr] || []

                return (
                  <Grid key={dateStr} size={{ xs: 12 / 7 }}>
                    <Paper
                      variant="outlined"
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragOverTarget !== dateStr) setDragOverTarget(dateStr)
                      }}
                      onDragLeave={() => {
                        if (dragOverTarget === dateStr) setDragOverTarget(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDropOnDate(dateStr)
                      }}
                      sx={{
                        minHeight: 110,
                        p: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: dragOverTarget === dateStr
                          ? 'action.selected'
                          : isToday
                          ? 'action.hover'
                          : isCurrentMonth
                          ? 'background.paper'
                          : 'action.disabledBackground',
                        opacity: isCurrentMonth ? 1 : 0.6,
                        borderColor: dragOverTarget === dateStr
                          ? 'primary.main'
                          : isToday
                          ? 'primary.main'
                          : 'divider',
                        borderWidth: dragOverTarget === dateStr ? 2 : 1,
                        borderStyle: dragOverTarget === dateStr ? 'dashed' : 'solid',
                        transition: 'background-color 0.2s, border-color 0.2s',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isToday ? 800 : 600,
                            color: isToday ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {day.getDate()}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenAdd(dateStr)}
                          sx={{ p: 0.25 }}
                          title={t.mealPlan.addMeal}
                          aria-label={t.mealPlan.addMeal}
                        >
                          <AddIcon sx={{ fontSize: '0.85rem' }} />
                        </IconButton>
                      </Box>

                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5, overflowY: 'auto' }}>
                        {dayItems.map((item) => (
                          <Box
                            key={item.id}
                            draggable
                            onDragStart={() => {
                              wasDraggedRef.current = true
                              setDraggedItemId(item.id)
                            }}
                            onDragEnd={() => {
                              setDraggedItemId(null)
                              setDragOverTarget(null)
                              setTimeout(() => {
                                wasDraggedRef.current = false
                              }, 100)
                            }}
                            onClick={() => handleCardClick(item)}
                            sx={{
                              p: 0.5,
                              borderRadius: 0.75,
                              bgcolor: 'action.hover',
                              cursor: 'pointer',
                              opacity: draggedItemId === item.id ? 0.4 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 0.5,
                              fontSize: '0.7rem',
                              '&:hover': { bgcolor: 'action.focus' },
                              '&:active': { cursor: 'grabbing' },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flexGrow: 1 }}>
                              <RecipeThumbnail
                                src={item.recipeCoverImagePath}
                                alt={item.title}
                                size={18}
                                borderRadius={0.5}
                                iconSize="inherit"
                              />
                              <Typography
                                variant="caption"
                                noWrap
                                sx={{
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                }}
                              >
                                {item.title}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}
      </Container>

      {/* Add / Edit Meal Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? t.mealPlan.editMeal : t.mealPlan.addMeal}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={itemType}
              onChange={(e) => setItemType(e.target.value as 'recipe' | 'custom')}
            >
              <FormControlLabel
                value="recipe"
                control={<Radio size="small" />}
                label={t.mealPlan.recipeOption}
              />
              <FormControlLabel
                value="custom"
                control={<Radio size="small" />}
                label={t.mealPlan.customOption}
              />
            </RadioGroup>
          </FormControl>

          {itemType === 'recipe' ? (
            <Autocomplete
              options={recipes}
              getOptionLabel={(option) => option.title}
              value={selectedRecipe}
              onChange={(_, newValue) => {
                setSelectedRecipe(newValue)
                if (newValue) {
                  // Keep defaultServings as preferred, fallback to recipe servings only if defaultServings is falsy
                  setServings(String(defaultServings || newValue.servings || ''))
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t.mealPlan.selectRecipe}
                  placeholder={t.mealPlan.recipePlaceholder}
                  required
                />
              )}
            />
          ) : (
            <TextField
              label={t.mealPlan.customTitleLabel}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              required
              fullWidth
            />
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label={t.mealPlan.mealTypeLabel}
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                fullWidth
              >
                <MenuItem value="breakfast">{t.mealPlan.mealTypes.breakfast}</MenuItem>
                <MenuItem value="lunch">{t.mealPlan.mealTypes.lunch}</MenuItem>
                <MenuItem value="dinner">{t.mealPlan.mealTypes.dinner}</MenuItem>
                <MenuItem value="snack">{t.mealPlan.mealTypes.snack}</MenuItem>
                <MenuItem value="other">{t.mealPlan.mealTypes.other}</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t.mealPlan.servingsLabel}
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Grid>
          </Grid>

          <TextField
            label={t.mealPlan.dateLabel}
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <TextField
            label={t.mealPlan.notesLabel}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {t.mealPlan.cancelButton}
          </Button>
          <Button onClick={handleSave} variant="contained">
            {t.mealPlan.saveButton}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Meal Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t.mealPlan.deleteDialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {itemToDelete ? (
              <>
                {t.mealPlan.deleteDialogMessage}
                {itemToDelete.title && (
                  <Box
                    component="span"
                    sx={{
                      display: 'block',
                      mt: 1.5,
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    « {itemToDelete.title} »
                  </Box>
                )}
              </>
            ) : (
              t.mealPlan.deleteDialogMessage
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button
            onClick={handleCloseDelete}
            disabled={deleting}
            color="inherit"
          >
            {t.mealPlan.cancelButton}
          </Button>
          <Button
            onClick={() => void handleConfirmDelete()}
            disabled={deleting}
            color="error"
            variant="contained"
            autoFocus
          >
            {deleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              t.mealPlan.deleteButton
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recipe Detail Modal */}
      <Dialog
        open={recipeDialogOpen}
        onClose={handleCloseRecipeDialog}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
            {viewingRecipe?.title || t.mealPlan.viewRecipe}
          </Typography>
          <IconButton
            aria-label={t.mealPlan.closeRecipe}
            onClick={handleCloseRecipeDialog}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {recipeLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : recipeError ? (
            <Alert severity="error">{recipeError}</Alert>
          ) : viewingRecipe ? (
            <Stack spacing={3}>
              <ModalHeaderImage
                src={viewingRecipe.imagePath}
                alt={viewingRecipe.title}
                fallbackLabel={t.recipes.imageFallback}
              />

              <Box>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                  {viewingRecipe.title}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {viewingRecipe.cookbook && (
                    <Chip size="small" variant="outlined" label={viewingRecipe.cookbook.name} />
                  )}
                  {viewingRecipe.tags.map((tag) => (
                    <Chip key={tag.id} size="small" label={tag.name} />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', color: 'text.secondary', mt: 1 }}>
                  {viewingRecipe.prepMinutes != null && (
                    <Typography variant="body2">
                      {formatTemplate(t.recipes.metaPrepMinutes, viewingRecipe.prepMinutes)}
                    </Typography>
                  )}
                  {viewingRecipe.cookMinutes != null && (
                    <Typography variant="body2">
                      {formatTemplate(t.recipes.metaCookMinutes, viewingRecipe.cookMinutes)}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider />

              {/* Servings stepper */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t.recipes.ingredientsTitle}
                </Typography>

                {targetServings != null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t.mealPlan.servingsLabel}:
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={targetServings <= 1}
                      onClick={() => setTargetServings((s) => Math.max(1, (s ?? 1) - 1))}
                      aria-label={t.recipes.decreaseServingsAriaLabel}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body1" sx={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>
                      {targetServings}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setTargetServings((s) => (s ?? 1) + 1)}
                      aria-label={t.recipes.increaseServingsAriaLabel}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {/* Ingredients list */}
              {viewingRecipe.ingredientRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t.recipes.noIngredients}
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {viewingRecipe.ingredientRows.map((row) => {
                    if (row.kind === 'heading') {
                      return (
                        <Typography
                          key={row.id}
                          variant="subtitle2"
                          sx={{ fontWeight: 700, mt: 1.5, color: 'text.primary' }}
                        >
                          {row.heading || '—'}
                        </Typography>
                      )
                    }

                    const scaleFactor =
                      !viewingRecipe.servings || !targetServings || viewingRecipe.servings <= 0 || targetServings <= 0
                        ? 1
                        : targetServings / viewingRecipe.servings

                    const scaledQuantity = scaleQuantityText(row.quantity, scaleFactor)

                    return (
                      <Box
                        key={row.id}
                        sx={{
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          fontSize: '0.875rem',
                        }}
                      >
                        <IngredientRowText row={row} quantityText={scaledQuantity} />
                      </Box>
                    )
                  })}
                </Stack>
              )}

              <Divider />

              {/* Instructions list */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
                  {t.recipes.instructionsTitle}
                </Typography>

                {viewingRecipe.instructions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t.recipes.noInstructions}
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {viewingRecipe.instructions.map((step, idx) => {
                      if (step.kind === 'heading') {
                        return (
                          <Typography
                            key={idx}
                            variant="subtitle2"
                            sx={{ fontWeight: 700, mt: 1.5, color: 'text.primary' }}
                          >
                            {step.text}
                          </Typography>
                        )
                      }

                      return (
                        <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              minWidth: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'primary.light',
                              color: 'primary.contrastText',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                              mt: 0.25,
                            }}
                          >
                            {idx + 1}
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {step.text}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          {viewingRecipeId ? (
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => {
                handleCloseRecipeDialog()
                navigate(`/recipes/${viewingRecipeId}`)
              }}
            >
              {t.mealPlan.openRecipePage}
            </Button>
          ) : (
            <Box />
          )}
          <Button onClick={handleCloseRecipeDialog} color="inherit">
            {t.mealPlan.closeRecipe}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={Boolean(errorMsg)}
        autoHideDuration={4000}
        onClose={() => setErrorMsg(null)}
      >
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg(null)}
      >
        <Alert severity="success" onClose={() => setSnackbarMsg(null)}>
          {snackbarMsg}
        </Alert>
      </Snackbar>

      <MobileBottomNav value="meal-plan" />
    </Box>
  )
}
