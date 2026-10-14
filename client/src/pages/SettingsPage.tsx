import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Drawer,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AppTopBar from '@/components/AppTopBar'
import MobileBottomNav from '@/components/MobileBottomNav'
import { useT } from '@/i18n/I18nContext'
import { SUPPORTED_LOCALES } from '@/i18n/types'
import type { Locale } from '@/i18n/types'

type SelectedModel = 'gemini-free'
type SelectedImageProvider = 'nano-banana' | 'free-provider'

interface AiSettingsResponse {
  selectedModel: SelectedModel
  availableModels: SelectedModel[]
  selectedImageProvider?: SelectedImageProvider
  availableImageProviders?: SelectedImageProvider[]
  geminiApiKey?: {
    configured: boolean
    masked: string | null
    updatedAt: string | null
  }
}

type SortField = 'updatedAt' | 'name'
type SortOrder = 'asc' | 'desc'

interface Store {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

const SORT_STORAGE_KEY = 'mp_stores_sort'
const MAX_NAME_LENGTH = 500
const DEFAULT_SORT_BY: SortField = 'updatedAt'
const DEFAULT_ORDER: SortOrder = 'desc'

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

function writeStoredSort(sortBy: SortField, order: SortOrder): void {
  window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortBy, order }))
}

function sortStores(stores: Store[], sortBy: SortField, order: SortOrder): Store[] {
  return [...stores].sort((a, b) => {
    if (sortBy === 'updatedAt') {
      const aTs = new Date(a.updatedAt).getTime()
      const bTs = new Date(b.updatedAt).getTime()
      return order === 'desc' ? bTs - aTs : aTs - bTs
    }

    const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    return order === 'asc' ? cmp : -cmp
  })
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useT()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab')
  const currentTab = rawTab === 'general' ? 'general' : rawTab === 'stores' ? 'stores' : 'ai'

  const handleTabChange = (_: React.SyntheticEvent, newTab: 'general' | 'ai' | 'stores') => {
    setSearchParams(newTab === 'ai' ? {} : { tab: newTab }, { replace: true })
  }

  // General Settings State
  const [defaultServings, setDefaultServings] = useState<string>('4')
  const [generalLoading, setGeneralLoading] = useState(true)
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalLoadError, setGeneralLoadError] = useState('')
  const [generalSaveError, setGeneralSaveError] = useState('')
  const [generalSaveSuccess, setGeneralSaveSuccess] = useState(false)

  // AI Settings State
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('gemini-free')
  const [availableModels, setAvailableModels] = useState<SelectedModel[]>(['gemini-free'])
  const [selectedImageProvider, setSelectedImageProvider] = useState<SelectedImageProvider>('nano-banana')
  const [availableImageProviders, setAvailableImageProviders] = useState<SelectedImageProvider[]>([
    'nano-banana',
    'free-provider',
  ])
  const [aiLoading, setAiLoading] = useState(true)
  const [aiSaving, setAiSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('')
  const [geminiApiKeyConfigured, setGeminiApiKeyConfigured] = useState(false)
  const [geminiApiKeyMasked, setGeminiApiKeyMasked] = useState<string | null>(null)
  const [geminiApiKeyUpdatedAt, setGeminiApiKeyUpdatedAt] = useState<string | null>(null)
  const [removeGeminiApiKey, setRemoveGeminiApiKey] = useState(false)

  // Stores State
  const sortRef = React.useRef<{ sortBy: SortField; order: SortOrder } | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT_BY)
  const [order, setOrder] = useState<SortOrder>(DEFAULT_ORDER)
  const [stores, setStores] = useState<Store[]>([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const [savingStore, setSavingStore] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load General Settings
  useEffect(() => {
    let active = true

    async function loadGeneralSettings() {
      setGeneralLoading(true)
      setGeneralLoadError('')

      try {
        const res = await fetch('/api/settings/general')
        const data = await res.json()

        if (!res.ok) {
          if (active) setGeneralLoadError(t.settings.errors.loadFailed)
          return
        }

        if (!active) return
        if (data.defaultMealPlanServings != null) {
          setDefaultServings(String(data.defaultMealPlanServings))
        }
      } catch {
        if (active) setGeneralLoadError(t.settings.errors.loadFailed)
      } finally {
        if (active) setGeneralLoading(false)
      }
    }

    loadGeneralSettings()

    return () => {
      active = false
    }
  }, [t.settings.errors.loadFailed])

  // Load AI Settings
  useEffect(() => {
    let active = true

    async function loadAiSettings() {
      setAiLoading(true)
      setLoadError('')

      try {
        const res = await fetch('/api/settings/ai')
        const data = (await res.json()) as Partial<AiSettingsResponse>

        if (!res.ok) {
          if (active) setLoadError(t.settings.errors.loadFailed)
          return
        }

        if (!active) return

        const nextSelected = data.selectedModel === 'gemini-free' ? data.selectedModel : 'gemini-free'
        const nextAvailable: SelectedModel[] = Array.isArray(data.availableModels)
          ? data.availableModels.filter((model): model is SelectedModel => model === 'gemini-free')
          : ['gemini-free']
        const nextSelectedImageProvider =
          data.selectedImageProvider === 'free-provider' ? 'free-provider' : 'nano-banana'
        const nextAvailableImageProviders: SelectedImageProvider[] = Array.isArray(data.availableImageProviders)
          ? data.availableImageProviders.filter(
              (p): p is SelectedImageProvider => p === 'nano-banana' || p === 'free-provider'
            )
          : ['nano-banana', 'free-provider']
        const nextGeminiApiKey = data.geminiApiKey

        setSelectedModel(nextSelected)
        setAvailableModels(nextAvailable.length > 0 ? nextAvailable : ['gemini-free'])
        setSelectedImageProvider(nextSelectedImageProvider)
        setAvailableImageProviders(
          nextAvailableImageProviders.length > 0 ? nextAvailableImageProviders : ['nano-banana', 'free-provider']
        )
        setGeminiApiKeyConfigured(Boolean(nextGeminiApiKey?.configured))
        setGeminiApiKeyMasked(nextGeminiApiKey?.masked ?? null)
        setGeminiApiKeyUpdatedAt(nextGeminiApiKey?.updatedAt ?? null)
        setGeminiApiKeyInput('')
        setRemoveGeminiApiKey(false)
      } catch {
        if (active) setLoadError(t.settings.errors.loadFailed)
      } finally {
        if (active) setAiLoading(false)
      }
    }

    loadAiSettings()

    return () => {
      active = false
    }
  }, [t.settings.errors.loadFailed])

  // Hydration-safe mount effect for Stores sort
  useEffect(() => {
    const stored = readStoredSort()
    sortRef.current = stored
    setSortBy(stored.sortBy)
    setOrder(stored.order)
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    writeStoredSort(sortBy, order)
  }, [sortBy, order, isMounted])

  // Load Stores
  useEffect(() => {
    if (!isMounted) return
    let active = true

    async function fetchStores() {
      setStoresLoading(true)
      setListError('')

      try {
        const params = new URLSearchParams({ sortBy, order })
        const res = await fetch(`/api/stores?${params.toString()}`)
        const data = await res.json()

        if (!res.ok) {
          if (active) {
            setListError(t.common.error)
          }
          return
        }

        if (active) {
          setStores(data.stores ?? [])
        }
      } catch {
        if (active) {
          setListError(t.common.error)
        }
      } finally {
        if (active) {
          setStoresLoading(false)
        }
      }
    }

    fetchStores()

    return () => {
      active = false
    }
  }, [sortBy, order, t.common.error, isMounted])

  async function handleSaveGeneral() {
    setGeneralSaving(true)
    setGeneralSaveError('')
    setGeneralSaveSuccess(false)

    const parsed = parseInt(defaultServings.trim(), 10)
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
      setGeneralSaveError('Veuillez entrer un nombre entier positif valide (entre 1 et 100).')
      setGeneralSaving(false)
      return
    }

    try {
      const res = await fetch('/api/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultMealPlanServings: parsed }),
      })

      if (!res.ok) {
        setGeneralSaveError(t.settings.errors.saveFailed)
        return
      }

      const data = await res.json()
      if (data.defaultMealPlanServings != null) {
        setDefaultServings(String(data.defaultMealPlanServings))
      }
      setGeneralSaveSuccess(true)
    } catch {
      setGeneralSaveError(t.settings.errors.saveFailed)
    } finally {
      setGeneralSaving(false)
    }
  }

  async function handleSaveAi() {
    setAiSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      const payload: {
        selectedModel: SelectedModel
        selectedImageProvider: SelectedImageProvider
        geminiApiKey?: string | null
      } = {
        selectedModel,
        selectedImageProvider,
      }

      if (removeGeminiApiKey) {
        payload.geminiApiKey = null
      } else if (geminiApiKeyInput.trim()) {
        payload.geminiApiKey = geminiApiKeyInput.trim()
      }

      const res = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await res.json()) as Partial<AiSettingsResponse>

      if (!res.ok) {
        setSaveError(t.settings.errors.saveFailed)
        return
      }

      const nextGeminiApiKey = data.geminiApiKey
      setGeminiApiKeyConfigured(Boolean(nextGeminiApiKey?.configured))
      setGeminiApiKeyMasked(nextGeminiApiKey?.masked ?? null)
      setGeminiApiKeyUpdatedAt(nextGeminiApiKey?.updatedAt ?? null)
      setGeminiApiKeyInput('')
      setRemoveGeminiApiKey(false)
      setSaveSuccess(true)
    } catch {
      setSaveError(t.settings.errors.saveFailed)
    } finally {
      setAiSaving(false)
    }
  }

  function getClientValidationError(trimmedName: string): string {
    if (!trimmedName) return t.stores.errors.required
    if (trimmedName.length > MAX_NAME_LENGTH) return t.stores.errors.maxLength
    return ''
  }

  function closeCreateDrawer() {
    if (creating) return
    setCreateOpen(false)
    setCreateName('')
    setCreateError('')
  }

  function openEditDrawer(store: Store) {
    setEditingStoreId(store.id)
    setEditName(store.name)
    setEditError('')
    setEditOpen(true)
  }

  function closeEditDrawer() {
    if (savingStore) return
    setEditOpen(false)
    setEditingStoreId(null)
    setEditName('')
    setEditError('')
  }

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = createName.trim()
    const validationError = getClientValidationError(trimmed)

    if (validationError) {
      setCreateError(validationError)
      return
    }

    setCreating(true)
    setCreateError('')

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setCreateError(t.stores.errors.duplicateGeneric)
          return
        }

        if (res.status === 400 && typeof data?.error === 'string') {
          if (data.error.includes('required')) {
            setCreateError(t.stores.errors.required)
            return
          }
          if (data.error.includes('500 characters')) {
            setCreateError(t.stores.errors.maxLength)
            return
          }
        }

        setCreateError(t.stores.errors.createFailed)
        return
      }

      const createdStore = data.store as Store
      setStores((prev) => sortStores([createdStore, ...prev], sortBy, order))
      closeCreateDrawer()
    } catch {
      setCreateError(t.stores.errors.createFailed)
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveStore(e: React.FormEvent) {
    e.preventDefault()

    if (!editingStoreId) return

    const trimmed = editName.trim()
    const validationError = getClientValidationError(trimmed)

    if (validationError) {
      setEditError(validationError)
      return
    }

    setSavingStore(true)
    setEditError('')

    try {
      const res = await fetch(`/api/stores/${editingStoreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setEditError(t.stores.errors.duplicateGeneric)
          return
        }
        if (res.status === 404) {
          setEditError(t.stores.errors.notFound)
          return
        }
        if (res.status === 400 && typeof data?.error === 'string') {
          if (data.error.includes('required')) {
            setEditError(t.stores.errors.required)
            return
          }
          if (data.error.includes('500 characters')) {
            setEditError(t.stores.errors.maxLength)
            return
          }
        }

        setEditError(t.stores.errors.updateFailed)
        return
      }

      const updatedStore = data.store as Store
      setStores((prev) =>
        sortStores(
          prev.map((store) => (store.id === updatedStore.id ? updatedStore : store)),
          sortBy,
          order
        )
      )
      closeEditDrawer()
    } catch {
      setEditError(t.stores.errors.updateFailed)
    } finally {
      setSavingStore(false)
    }
  }

  async function handleDeleteStore(store: Store) {
    if (!window.confirm(t.stores.deleteConfirm)) return

    setDeletingId(store.id)
    setListError('')

    try {
      const res = await fetch(`/api/stores/${store.id}`, { method: 'DELETE' })

      if (!res.ok) {
        setListError(res.status === 404 ? t.stores.errors.notFound : t.stores.errors.deleteFailed)
        return
      }

      setStores((prev) => prev.filter((item) => item.id !== store.id))
    } catch {
      setListError(t.stores.errors.deleteFailed)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.settings.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t.settings.subtitle}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Button component={Link} to="/recipes" variant="outlined">
            {t.settings.backToApp}
          </Button>
        </Box>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="general" label={t.settings.tabGeneral} />
          <Tab value="ai" label={t.settings.tabAi} />
          <Tab value="stores" label={t.settings.tabStores} />
        </Tabs>

        {currentTab === 'general' && (
          <Box sx={{ maxWidth: 'md' }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {t.settings.generalSection.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t.settings.generalSection.description}
                </Typography>

                {generalLoadError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {generalLoadError}
                  </Alert>
                )}

                {generalSaveError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {generalSaveError}
                  </Alert>
                )}

                {generalSaveSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {t.settings.saved}
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {t.settings.generalSection.languageLabel}
                    </Typography>
                    <ToggleButtonGroup
                      value={locale}
                      exclusive
                      size="small"
                      onChange={(_, value: Locale | null) => {
                        if (value) setLocale(value)
                      }}
                    >
                      {SUPPORTED_LOCALES.map((loc) => (
                        <ToggleButton key={loc} value={loc} sx={{ px: 2, textTransform: 'uppercase' }}>
                          {loc}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {t.settings.generalSection.languageHint}
                    </Typography>
                  </Box>

                  <TextField
                    label={t.settings.generalSection.defaultServingsLabel}
                    helperText={t.settings.generalSection.defaultServingsHint}
                    type="number"
                    size="small"
                    value={defaultServings}
                    onChange={(e) => {
                      setDefaultServings(e.target.value)
                      setGeneralSaveSuccess(false)
                    }}
                    disabled={generalLoading || generalSaving}
                    slotProps={{ htmlInput: { min: 1, max: 100 } }}
                    sx={{ maxWidth: 320 }}
                  />

                  <Box>
                    <Button
                      variant="contained"
                      onClick={handleSaveGeneral}
                      disabled={generalLoading || generalSaving}
                    >
                      {t.settings.saveButton}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {currentTab === 'ai' && (
          <Box sx={{ maxWidth: 'md' }}>
            <Card elevation={0}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {t.settings.aiSection.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t.settings.aiSection.description}
                </Typography>

                {loadError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {loadError}
                  </Alert>
                )}

                {saveError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {saveError}
                  </Alert>
                )}

                {saveSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {t.settings.saved}
                  </Alert>
                )}

                <FormControl fullWidth size="small" disabled={aiLoading || aiSaving}>
                  <InputLabel id="settings-ai-model-label">{t.settings.aiSection.modelLabel}</InputLabel>
                  <Select
                    labelId="settings-ai-model-label"
                    label={t.settings.aiSection.modelLabel}
                    value={selectedModel}
                    onChange={(event) => {
                      const value = event.target.value as SelectedModel
                      setSelectedModel(value)
                      setSaveSuccess(false)
                    }}
                  >
                    {availableModels.map((model) => (
                      <MenuItem key={model} value={model}>
                        {t.settings.aiSection.models.geminiFree}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" disabled={aiLoading || aiSaving} sx={{ mt: 2 }}>
                  <InputLabel id="settings-ai-image-provider-label">
                    {t.settings.aiSection.imageProviderLabel}
                  </InputLabel>
                  <Select
                    labelId="settings-ai-image-provider-label"
                    label={t.settings.aiSection.imageProviderLabel}
                    value={selectedImageProvider}
                    onChange={(event) => {
                      const value = event.target.value as SelectedImageProvider
                      setSelectedImageProvider(value)
                      setSaveSuccess(false)
                    }}
                  >
                    {availableImageProviders.map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {provider === 'nano-banana'
                          ? t.settings.aiSection.imageProviders.nanoBanana
                          : t.settings.aiSection.imageProviders.freeProvider}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.5}>
                  <Typography variant="subtitle2">{t.settings.aiSection.apiKeyLabel}</Typography>

                  <Typography variant="body2" color="text.secondary">
                    {geminiApiKeyConfigured
                      ? `${t.settings.aiSection.apiKeyConfigured}: ${geminiApiKeyMasked ?? ''}`
                      : t.settings.aiSection.apiKeyNotConfigured}
                  </Typography>

                  {geminiApiKeyUpdatedAt && (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.settings.aiSection.apiKeyUpdatedAtLabel}: ${new Date(geminiApiKeyUpdatedAt).toLocaleString()}`}
                    </Typography>
                  )}

                  <TextField
                    label={t.settings.aiSection.apiKeyLabel}
                    size="small"
                    type="password"
                    value={geminiApiKeyInput}
                    onChange={(event) => {
                      setGeminiApiKeyInput(event.target.value)
                      setRemoveGeminiApiKey(false)
                      setSaveSuccess(false)
                    }}
                    disabled={aiLoading || aiSaving}
                  />

                  <Typography variant="caption" color="text.secondary">
                    {t.settings.aiSection.apiKeyHint}
                  </Typography>

                  <Box>
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => {
                        setRemoveGeminiApiKey(true)
                        setGeminiApiKeyInput('')
                        setSaveSuccess(false)
                      }}
                      disabled={aiLoading || aiSaving || !geminiApiKeyConfigured}
                    >
                      {t.settings.aiSection.removeKeyButton}
                    </Button>
                  </Box>
                </Stack>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveAi}
                    disabled={aiLoading || aiSaving}
                  >
                    {t.settings.saveButton}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {currentTab === 'stores' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="stores-sort-by-label">{t.stores.sortLabel}</InputLabel>
                <Select
                  labelId="stores-sort-by-label"
                  label={t.stores.sortLabel}
                  value={sortBy}
                  onChange={(event) => {
                    const value = event.target.value as SortField
                    setSortBy(value)
                  }}
                >
                  <MenuItem value="updatedAt">{t.stores.sortUpdated}</MenuItem>
                  <MenuItem value="name">{t.stores.sortName}</MenuItem>
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
                <ToggleButton value="asc">{t.stores.orderAsc}</ToggleButton>
                <ToggleButton value="desc">{t.stores.orderDesc}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {listError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {listError}
              </Alert>
            )}

            {!storesLoading && stores.length === 0 ? (
              <Card elevation={0}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {t.stores.noStoresTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.stores.noStoresSubtitle}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={3}>
                {stores.map((store) => (
                  <Grid key={store.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card elevation={0}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="h6">{store.name}</Typography>
                          <Box>
                            <Tooltip title={t.stores.editButtonAriaLabel}>
                              <IconButton
                                size="small"
                                aria-label={t.stores.editButtonAriaLabel}
                                onClick={() => openEditDrawer(store)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t.stores.deleteButtonAriaLabel}>
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label={t.stores.deleteButtonAriaLabel}
                                  onClick={() => handleDeleteStore(store)}
                                  disabled={deletingId === store.id}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            <Fab
              color="primary"
              aria-label={t.stores.addFabAriaLabel}
              sx={{ position: 'fixed', bottom: { xs: 88, md: 24 }, right: 24 }}
              onClick={() => {
                setCreateError('')
                setCreateName('')
                setCreateOpen(true)
              }}
            >
              <AddIcon />
            </Fab>

            <Drawer anchor="bottom" open={createOpen} onClose={closeCreateDrawer}>
              <Box
                component="form"
                onSubmit={handleCreateStore}
                sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t.stores.createDialogTitle}
                </Typography>
                {createError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label={t.stores.nameLabel}
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  autoFocus
                  required
                  slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                  disabled={creating}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button onClick={closeCreateDrawer} disabled={creating}>
                    {t.stores.cancelButton}
                  </Button>
                  <Button type="submit" variant="contained" disabled={creating}>
                    {t.stores.createButton}
                  </Button>
                </Box>
              </Box>
            </Drawer>

            <Drawer anchor="bottom" open={editOpen} onClose={closeEditDrawer}>
              <Box
                component="form"
                onSubmit={handleSaveStore}
                sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t.stores.editDialogTitle}
                </Typography>
                {editError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {editError}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label={t.stores.nameLabel}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  autoFocus
                  required
                  slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
                  disabled={savingStore}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button onClick={closeEditDrawer} disabled={savingStore}>
                    {t.stores.cancelButton}
                  </Button>
                  <Button type="submit" variant="contained" disabled={savingStore || !editingStoreId}>
                    {t.stores.saveButton}
                  </Button>
                </Box>
              </Box>
            </Drawer>
          </Box>
        )}
      </Container>

      <MobileBottomNav value={null} />
    </Box>
  )
}
