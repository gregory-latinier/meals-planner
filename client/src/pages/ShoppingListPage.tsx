import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HistoryIcon from '@mui/icons-material/History'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useLocation, useNavigate } from 'react-router-dom'
import AppTopBar from '../components/AppTopBar'
import MobileBottomNav from '../components/MobileBottomNav'
import { useT } from '../i18n/I18nContext'
import { useRealtime } from '../hooks/useRealtime'
import {
  addShoppingListItem,
  completeShoppingList,
  deleteShoppingListItem,
  fetchActiveShoppingList,
  setIngredientInStock,
  updateShoppingListItem,
} from '../api/shopping-lists'
import { formatItemQuantity } from '../lib/shopping-list-format'
import type { ShoppingListItem } from '../types/models'

interface StoreOption {
  id: string
  name: string
}

const HIDE_CHECKED_KEY = 'mp_shopping_hide_checked'
const SYNC_INTERVAL_MS = 5000
const NO_STORE = '__none__'

/** Quantity (bold) then name, on a single line. */
function ItemLabel({ item }: { item: ShoppingListItem }) {
  const quantity = formatItemQuantity(item)
  return (
    <Typography
      sx={{
        textDecoration: item.checked ? 'line-through' : 'none',
        color: item.checked ? 'text.disabled' : 'text.primary',
        wordBreak: 'break-word',
      }}
    >
      {quantity && (
        <Box component="span" sx={{ fontWeight: 700, mr: 0.75 }}>
          {quantity}
        </Box>
      )}
      {item.name}
    </Typography>
  )
}

function ItemRow({
  item,
  onToggle,
  onEdit,
}: {
  item: ShoppingListItem
  onToggle: (item: ShoppingListItem) => void
  onEdit: (item: ShoppingListItem) => void
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Checkbox
        checked={item.checked}
        onChange={() => onToggle(item)}
        slotProps={{ input: { 'aria-label': item.name } }}
        sx={{ p: 1.5 }}
      />
      <Box onClick={() => onEdit(item)} sx={{ flexGrow: 1, py: 1.25, pr: 1, cursor: 'pointer', minWidth: 0 }}>
        <ItemLabel item={item} />
      </Box>
    </Box>
  )
}

function DraggableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      sx={{
        opacity: isDragging ? 0.4 : 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
        // No text selection / callout menu when long-pressing to drag on mobile.
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
    </Box>
  )
}

function DroppableSection({ id, dragging, children }: { id: string; dragging: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <Box
      ref={setNodeRef}
      sx={{
        mb: 2,
        p: 0.5,
        borderRadius: 1,
        border: '2px dashed',
        borderColor: isOver ? 'primary.main' : dragging ? 'divider' : 'transparent',
        bgcolor: isOver ? 'action.hover' : 'transparent',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </Box>
  )
}

function DropChip({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `bar:${id}` })
  return (
    <Chip
      ref={setNodeRef}
      label={label}
      color={isOver ? 'primary' : 'default'}
      variant={isOver ? 'filled' : 'outlined'}
      sx={{ height: 40, fontSize: '0.95rem' }}
    />
  )
}

export default function ShoppingListPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const location = useLocation()

  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null
  )

  const [newName, setNewName] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [adding, setAdding] = useState(false)

  const [storeFilter, setStoreFilter] = useState<string | null>(null)
  const [hideChecked, setHideChecked] = useState(() => window.localStorage.getItem(HIDE_CHECKED_KEY) === '1')
  const [pantryOpen, setPantryOpen] = useState(false)

  const [editing, setEditing] = useState<ShoppingListItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editStoreId, setEditStoreId] = useState('')
  const [saving, setSaving] = useState(false)

  const [finishOpen, setFinishOpen] = useState(false)
  const [carryOver, setCarryOver] = useState(true)
  const [finishing, setFinishing] = useState(false)

  // Number of optimistic mutations in flight: a refetch started meanwhile would overwrite them.
  const pendingRef = useRef(0)
  const refetchAfterPendingRef = useRef(false)

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true)
      try {
        const data = await fetchActiveShoppingList()
        if (pendingRef.current > 0) {
          refetchAfterPendingRef.current = true
          return
        }
        // Keep the same reference when nothing changed so periodic refreshes do not re-render the list.
        setItems((prev) => (JSON.stringify(prev) === JSON.stringify(data.items) ? prev : data.items))
      } catch {
        setErrorMsg(t.shoppingList.loadFailed)
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    void load(true)
  }, [load])

  useEffect(() => {
    let active = true
    fetch('/api/stores')
      .then((res) => (res.ok ? res.json() : { stores: [] }))
      .then((data) => {
        if (active) setStores((data.stores ?? []) as StoreOption[])
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const { connected } = useRealtime((data) => {
    if (data.type.startsWith('shopping_list:')) void load()
  })

  // Catch up on what was missed while the socket was down (phone locked in a shop, bad network).
  useEffect(() => {
    if (connected) void load()
  }, [connected, load])

  // The socket is not reliable on every host (shared hosting running several Node processes,
  // proxies breaking WebSockets), so also poll while the page is visible and refresh on return.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const timer = window.setInterval(refresh, SYNC_INTERVAL_MS)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [load])

  // Keep the screen on while shopping.
  useEffect(() => {
    type WakeLockSentinelLike = { release: () => Promise<void> }
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }
    if (!nav.wakeLock) return
    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    async function acquire() {
      try {
        const lock = await nav.wakeLock!.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Not allowed (e.g. low battery): ignore.
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => undefined)
    }
  }, [])

  function toggleHideChecked() {
    setHideChecked((prev) => {
      window.localStorage.setItem(HIDE_CHECKED_KEY, prev ? '0' : '1')
      return !prev
    })
  }

  async function runOptimistic(
    apply: (prev: ShoppingListItem[]) => ShoppingListItem[],
    request: () => Promise<unknown>,
    failureMessage: string
  ) {
    let snapshot: ShoppingListItem[] = []
    setItems((prev) => {
      snapshot = prev
      return apply(prev)
    })
    pendingRef.current++
    try {
      await request()
    } catch {
      setItems(snapshot)
      setErrorMsg(failureMessage)
    } finally {
      pendingRef.current--
      if (pendingRef.current === 0 && refetchAfterPendingRef.current) {
        refetchAfterPendingRef.current = false
        void load()
      }
    }
  }

  function handleToggle(item: ShoppingListItem) {
    const checked = !item.checked
    void runOptimistic(
      (prev) => prev.map((i) => (i.id === item.id ? { ...i, checked } : i)),
      () => updateShoppingListItem(item.id, { checked }),
      t.shoppingList.updateFailed
    )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      await addShoppingListItem({ name, quantityText: newQuantity.trim() || null })
      setNewName('')
      setNewQuantity('')
      await load()
    } catch {
      setErrorMsg(t.shoppingList.addFailed)
    } finally {
      setAdding(false)
    }
  }

  function openEdit(item: ShoppingListItem) {
    setEditing(item)
    setEditName(item.name)
    setEditQuantity(formatItemQuantity(item))
    setEditStoreId(item.storeId ?? '')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const name = editName.trim()
    if (!name) return
    const payload: Parameters<typeof updateShoppingListItem>[1] = {}
    if (name !== editing.name) payload.name = name
    if (editQuantity.trim() !== formatItemQuantity(editing)) payload.quantityText = editQuantity.trim() || null
    if ((editStoreId || null) !== editing.storeId) payload.storeId = editStoreId || null

    if (Object.keys(payload).length === 0) {
      setEditing(null)
      return
    }
    setSaving(true)
    try {
      await updateShoppingListItem(editing.id, payload)
      setEditing(null)
      await load()
    } catch {
      setErrorMsg(t.shoppingList.updateFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(alwaysInStock: boolean) {
    if (!editing) return
    const target = editing
    setEditing(null)
    await runOptimistic(
      (prev) => prev.filter((i) => i.id !== target.id),
      () => deleteShoppingListItem(target.id, alwaysInStock),
      t.shoppingList.deleteFailed
    )
  }

  function handleNeedIt(item: ShoppingListItem) {
    void runOptimistic(
      (prev) => prev.map((i) => (i.id === item.id ? { ...i, pantryCheck: false } : i)),
      () => updateShoppingListItem(item.id, { pantryCheck: false }),
      t.shoppingList.updateFailed
    )
  }

  function handleNoLongerInStock(item: ShoppingListItem) {
    if (!item.ingredientId) return handleNeedIt(item)
    const ingredientId = item.ingredientId
    void runOptimistic(
      (prev) => prev.map((i) => (i.ingredientId === ingredientId ? { ...i, pantryCheck: false } : i)),
      () => setIngredientInStock(ingredientId, false),
      t.shoppingList.updateFailed
    )
  }

  async function handleFinish() {
    setFinishing(true)
    try {
      await completeShoppingList(carryOver && unboughtCount > 0)
      setFinishOpen(false)
      setSnackbarMsg(t.shoppingList.finishedSnack)
      await load()
    } catch {
      setErrorMsg(t.shoppingList.completeFailed)
    } finally {
      setFinishing(false)
    }
  }

  const mainItems = useMemo(() => items.filter((i) => !i.pantryCheck), [items])
  const pantryItems = useMemo(() => items.filter((i) => i.pantryCheck && !i.checked), [items])
  const checkedCount = mainItems.filter((i) => i.checked).length
  const unboughtCount = mainItems.length - checkedCount

  const usedStores = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of mainItems) {
      if (item.storeId && item.storeName) map.set(item.storeId, item.storeName)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [mainItems])

  const hasNoStoreItems = mainItems.some((i) => !i.storeId)

  // If the filtered store disappeared (item moved/deleted), fall back to everything.
  useEffect(() => {
    if (storeFilter === null) return
    const exists = storeFilter === NO_STORE ? hasNoStoreItems : usedStores.some((s) => s.id === storeFilter)
    if (!exists) setStoreFilter(null)
  }, [storeFilter, hasNoStoreItems, usedStores])

  const sections = useMemo(() => {
    const visible = mainItems.filter((item) => {
      if (hideChecked && item.checked) return false
      if (storeFilter === null) return true
      return storeFilter === NO_STORE ? !item.storeId : item.storeId === storeFilter
    })
    const groups = new Map<string, { key: string; name: string | null; items: ShoppingListItem[] }>()
    for (const item of visible) {
      const key = item.storeId ?? NO_STORE
      const group = groups.get(key) ?? { key, name: item.storeName, items: [] }
      group.items.push(item)
      groups.set(key, group)
    }
    // "No store" first to encourage assigning one, then stores alphabetically.
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === NO_STORE) return -1
      if (b.key === NO_STORE) return 1
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [mainItems, hideChecked, storeFilter])

  // Mouse: small move starts a drag. Touch: long press, so that swiping still scrolls the list.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const draggedItem = draggedId ? items.find((i) => i.id === draggedId) ?? null : null

  function handleDragEnd(event: DragEndEvent) {
    setDraggedId(null)
    if (!event.over) return
    const item = items.find((i) => i.id === event.active.id)
    if (!item) return
    const targetKey = String(event.over.id).replace(/^bar:/, '')
    const targetStoreId = targetKey === NO_STORE ? null : targetKey
    if ((item.storeId ?? null) === targetStoreId) return
    const targetName = targetStoreId ? stores.find((s) => s.id === targetStoreId)?.name ?? null : null
    void runOptimistic(
      (prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, storeId: targetStoreId, storeName: targetName } : i)),
      () => updateShoppingListItem(item.id, { storeId: targetStoreId }),
      t.shoppingList.updateFailed
    )
  }

  function renderItem(item: ShoppingListItem) {
    return (
      <DraggableItem key={item.id} id={item.id}>
        <ItemRow item={item} onToggle={handleToggle} onEdit={openEdit} />
      </DraggableItem>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: { xs: 10, md: 4 } }}>
      <AppTopBar />
      <Container maxWidth="md" sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {t.shoppingList.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.shoppingList.subtitle}
            </Typography>
          </Box>
          <Button startIcon={<HistoryIcon />} onClick={() => navigate('/shopping-lists')} sx={{ flexShrink: 0 }}>
            {t.shoppingList.history}
          </Button>
        </Box>

        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t.shoppingList.addPlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 300, 'aria-label': t.shoppingList.addPlaceholder } }}
            />
            <TextField
              size="small"
              placeholder={t.shoppingList.quantityPlaceholder}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              sx={{ width: { xs: 110, sm: 160 }, flexShrink: 0 }}
              slotProps={{ htmlInput: { maxLength: 200, 'aria-label': t.shoppingList.quantityPlaceholder } }}
            />
            <IconButton
              type="submit"
              color="primary"
              disabled={adding || !newName.trim()}
              aria-label={t.shoppingList.addButton}
              title={t.shoppingList.addButton}
            >
              <AddIcon />
            </IconButton>
          </Box>

          {mainItems.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t.shoppingList.progress
                    .replace('{checked}', String(checkedCount))
                    .replace('{total}', String(mainItems.length))}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  size="small"
                  onClick={toggleHideChecked}
                  aria-label={hideChecked ? t.shoppingList.showChecked : t.shoppingList.hideChecked}
                  title={hideChecked ? t.shoppingList.showChecked : t.shoppingList.hideChecked}
                >
                  {hideChecked ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              </Box>
              <LinearProgress
                variant="determinate"
                value={mainItems.length ? (checkedCount / mainItems.length) * 100 : 0}
                sx={{ borderRadius: 1, height: 6 }}
              />
            </Box>
          )}

          {(usedStores.length > 0 || (hasNoStoreItems && usedStores.length > 0)) && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                label={t.shoppingList.allStores}
                color={storeFilter === null ? 'primary' : 'default'}
                onClick={() => setStoreFilter(null)}
              />
              {hasNoStoreItems && (
                <Chip
                  label={t.shoppingList.noStore}
                  color={storeFilter === NO_STORE ? 'primary' : 'default'}
                  onClick={() => setStoreFilter(NO_STORE)}
                />
              )}
              {usedStores.map((store) => (
                <Chip
                  key={store.id}
                  label={store.name}
                  color={storeFilter === store.id ? 'primary' : 'default'}
                  onClick={() => setStoreFilter(store.id)}
                />
              ))}
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : mainItems.length === 0 && pantryItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ fontWeight: 600 }}>{t.shoppingList.empty}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t.shoppingList.emptyHint}
              </Typography>
            </Box>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={(event) => setDraggedId(String(event.active.id))}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setDraggedId(null)}
            >
              {sections.map((section) => (
                <DroppableSection key={section.key} id={section.key} dragging={Boolean(draggedId)}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}
                  >
                    {section.key === NO_STORE ? t.shoppingList.noStore : section.name}
                  </Typography>
                  <Box>{section.items.map(renderItem)}</Box>
                </DroppableSection>
              ))}

              {/* Drop targets for every store, so an item can be moved to a store that has no item yet. */}
              {draggedId && (
                <Box
                  sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: { xs: 64, md: 0 },
                    zIndex: (theme) => theme.zIndex.appBar + 1,
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 3,
                  }}
                >
                  <DropChip id={NO_STORE} label={t.shoppingList.noStore} />
                  {stores.map((store) => (
                    <DropChip key={store.id} id={store.id} label={store.name} />
                  ))}
                </Box>
              )}

              <DragOverlay>
                {draggedItem ? (
                  <Paper elevation={6} sx={{ px: 2, py: 1.25, maxWidth: 320 }}>
                    <ItemLabel item={draggedItem} />
                  </Paper>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {pantryItems.length > 0 && (
            <Box sx={{ mt: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Box
                onClick={() => setPantryOpen((prev) => !prev)}
                sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1, cursor: 'pointer' }}
              >
                <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>
                  {t.shoppingList.pantryTitle.replace('{count}', String(pantryItems.length))}
                </Typography>
                {pantryOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
              <Collapse in={pantryOpen}>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 1 }}>
                  {t.shoppingList.pantryHint}
                </Typography>
                {pantryItems.map((item) => {
                  const quantity = formatItemQuantity(item)
                  return (
                    <Box
                      key={item.id}
                      sx={{ px: 1.5, py: 1, borderTop: '1px solid', borderColor: 'divider' }}
                    >
                      <Typography>
                        {item.name}
                        {quantity && (
                          <Typography component="span" color="text.secondary">
                            {' — '}
                            {quantity}
                          </Typography>
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Button size="small" variant="contained" onClick={() => handleNeedIt(item)}>
                          {t.shoppingList.needIt}
                        </Button>
                        <Button size="small" color="inherit" onClick={() => handleNoLongerInStock(item)}>
                          {t.shoppingList.noLongerInStock}
                        </Button>
                      </Box>
                    </Box>
                  )
                })}
              </Collapse>
            </Box>
          )}

          {mainItems.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" startIcon={<DoneAllIcon />} onClick={() => setFinishOpen(true)}>
                {t.shoppingList.finish}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>

      <Drawer anchor="bottom" open={Boolean(editing)} onClose={() => !saving && setEditing(null)}>
        <Box component="form" onSubmit={handleSaveEdit} sx={{ p: 3, display: 'grid', gap: 2, maxWidth: 560, mx: 'auto', width: '100%' }}>
          <Typography variant="h6">{t.shoppingList.editTitle}</Typography>
          <TextField
            label={t.shoppingList.nameLabel}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 300 } }}
            required
            fullWidth
          />
          <TextField
            label={t.shoppingList.quantityLabel}
            value={editQuantity}
            onChange={(e) => setEditQuantity(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="shopping-edit-store">{t.shoppingList.storeLabel}</InputLabel>
            <Select
              labelId="shopping-edit-store"
              label={t.shoppingList.storeLabel}
              value={editStoreId}
              onChange={(e) => setEditStoreId(e.target.value)}
            >
              <MenuItem value="">{t.shoppingList.noStore}</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button type="submit" variant="contained" disabled={saving || !editName.trim()}>
              {t.shoppingList.save}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            {editing?.ingredientId && (
              <Button color="warning" onClick={() => handleDelete(true)} disabled={saving}>
                {t.shoppingList.deleteAlwaysInStock}
              </Button>
            )}
            <Button color="error" onClick={() => handleDelete(false)} disabled={saving}>
              {t.shoppingList.delete}
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={finishOpen} onClose={() => !finishing && setFinishOpen(false)}>
        <DialogTitle>{t.shoppingList.finishTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t.shoppingList.finishText}</DialogContentText>
          {unboughtCount > 0 && (
            <FormControlLabel
              sx={{ mt: 1 }}
              control={<Checkbox checked={carryOver} onChange={(e) => setCarryOver(e.target.checked)} />}
              label={t.shoppingList.carryOver.replace('{count}', String(unboughtCount))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setFinishOpen(false)} disabled={finishing}>
            {t.stores.cancelButton}
          </Button>
          <Button variant="contained" onClick={handleFinish} disabled={finishing}>
            {t.shoppingList.finishConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(errorMsg)} autoHideDuration={4000} onClose={() => setErrorMsg(null)}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(snackbarMsg)} autoHideDuration={4000} onClose={() => setSnackbarMsg(null)}>
        <Alert severity="success" onClose={() => setSnackbarMsg(null)}>
          {snackbarMsg}
        </Alert>
      </Snackbar>

      <MobileBottomNav value="shopping-list" />
    </Box>
  )
}
