'use client'

import React, { useEffect, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
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
  Drawer,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import LogoutIcon from '@mui/icons-material/Logout'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/useRealtime'
import { useT } from '@/i18n/I18nContext'
import { SUPPORTED_LOCALES } from '@/i18n/types'
import type { Locale } from '@/i18n/types'
import MobileBottomNav from '@/components/MobileBottomNav'

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

export default function StoresClient() {
  const router = useRouter()
  const { connected } = useRealtime()
  const { t, locale, setLocale } = useT()

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
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Hydration-safe mount effect: synchronise sort state with localStorage after
  // the first client render. Both server and first client render use defaults,
  // so React sees no mismatch. After mount we apply the stored preference.
  useEffect(() => {
    const stored = readStoredSort()
    sortRef.current = stored
    setSortBy(stored.sortBy) // eslint-disable-line react-hooks/set-state-in-effect
    setOrder(stored.order)
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    writeStoredSort(sortBy, order)
  }, [sortBy, order, isMounted])

  useEffect(() => {
    if (!isMounted) return
    let active = true

    async function fetchStores() {
      setLoading(true)
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
          setLoading(false)
        }
      }
    }

    fetchStores()

    return () => {
      active = false
    }
  }, [sortBy, order, t.common.error, isMounted])

  function handleLocaleChange(_: React.MouseEvent<HTMLElement>, value: Locale | null) {
    if (value) setLocale(value)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function getClientValidationError(trimmedName: string): string {
    if (!trimmedName) return t.stores.errors.required
    if (trimmedName.length > MAX_NAME_LENGTH) return t.stores.errors.maxLength
    return ''
  }

  function closeCreateDrawer() {
    if (creating) {
      return
    }

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
    if (saving) {
      return
    }

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

    if (!editingStoreId) {
      return
    }

    const trimmed = editName.trim()
    const validationError = getClientValidationError(trimmed)

    if (validationError) {
      setEditError(validationError)
      return
    }

    setSaving(true)
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
      setSaving(false)
    }
  }

  async function handleDeleteStore(store: Store) {
    if (!window.confirm(t.stores.deleteConfirm)) {
      return
    }

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

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 12, md: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.stores.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t.stores.subtitle}
        </Typography>

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

        {!loading && stores.length === 0 ? (
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
      </Container>

      <MobileBottomNav value="stores" />

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
            disabled={saving}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={closeEditDrawer} disabled={saving}>
              {t.stores.cancelButton}
            </Button>
            <Button type="submit" variant="contained" disabled={saving || !editingStoreId}>
              {t.stores.saveButton}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
