import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate, useParams } from 'react-router-dom'
import AppTopBar from '../components/AppTopBar'
import MobileBottomNav from '../components/MobileBottomNav'
import { useT } from '../i18n/I18nContext'
import {
  copyShoppingListItems,
  fetchShoppingList,
  fetchShoppingLists,
  type ShoppingListWithItems,
} from '../api/shopping-lists'
import { formatItemQuantity } from '../lib/shopping-list-format'
import type { ShoppingListItem, ShoppingListSummary } from '../types/models'

const NO_STORE = '__none__'

export default function ShoppingListHistoryPage() {
  const { listId } = useParams<{ listId: string }>()
  return listId ? <HistoryDetail listId={listId} /> : <HistoryIndex />
}

function useFormatDate() {
  const { locale } = useT()
  return (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

function HistoryIndex() {
  const { t } = useT()
  const navigate = useNavigate()
  const formatDate = useFormatDate()
  const [history, setHistory] = useState<ShoppingListSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchShoppingLists()
      .then((data) => setHistory(data.history))
      .catch(() => setErrorMsg(t.shoppingList.loadFailed))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <Box sx={{ minHeight: '100vh', pb: { xs: 10, md: 4 } }}>
      <AppTopBar />
      <Container maxWidth="md" sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t.shoppingList.historyTitle}
          </Typography>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/shopping-list')} sx={{ flexShrink: 0 }}>
            {t.shoppingList.backToCurrent}
          </Button>
        </Box>

        <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.paper' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {t.shoppingList.historyEmpty}
            </Typography>
          ) : (
            <List>
              {history.map((list) => (
                <ListItemButton key={list.id} onClick={() => navigate(`/shopping-lists/${list.id}`)}>
                  <ListItemText
                    primary={formatDate(list.completedAt ?? list.createdAt)}
                    secondary={t.shoppingList.historyItems.replace('{count}', String(list.itemCount))}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      </Container>
      <Snackbar open={Boolean(errorMsg)} autoHideDuration={4000} onClose={() => setErrorMsg(null)}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>
      <MobileBottomNav value="shopping-list" />
    </Box>
  )
}

function HistoryDetail({ listId }: { listId: string }) {
  const { t } = useT()
  const navigate = useNavigate()
  const formatDate = useFormatDate()
  const [data, setData] = useState<ShoppingListWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchShoppingList(listId)
      .then(setData)
      .catch(() => setErrorMsg(t.shoppingList.loadFailed))
      .finally(() => setLoading(false))
  }, [listId, t])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCopy() {
    if (selected.size === 0) return
    setCopying(true)
    try {
      const result = await copyShoppingListItems(Array.from(selected))
      const message = t.shoppingList.addedSnack.replace('{count}', String(result.added + result.merged))
      navigate('/shopping-list', { state: { message } })
    } catch {
      setErrorMsg(t.shoppingList.copyFailed)
      setCopying(false)
    }
  }

  // Same grouping as the current list: "no store" first, then stores alphabetically.
  const sections = useMemo(() => {
    const groups = new Map<string, { key: string; name: string | null; items: ShoppingListItem[] }>()
    for (const item of data?.items ?? []) {
      const key = item.storeId ?? NO_STORE
      const group = groups.get(key) ?? { key, name: item.storeName, items: [] }
      group.items.push(item)
      groups.set(key, group)
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === NO_STORE) return -1
      if (b.key === NO_STORE) return 1
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [data])
  const date = data?.list ? formatDate(data.list.completedAt ?? data.list.createdAt) : ''

  return (
    <Box sx={{ minHeight: '100vh', pb: { xs: 18, md: 4 } }}>
      <AppTopBar />
      <Container maxWidth="md" sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {date}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.shoppingList.selectItems}
            </Typography>
          </Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/shopping-lists')} sx={{ flexShrink: 0 }}>
            {t.shoppingList.historyTitle}
          </Button>
        </Box>

        <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.paper' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            sections.map((section) => (
              <Box key={section.key} sx={{ mb: 1 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, display: 'block', px: 1 }}
                >
                  {section.name ?? t.shoppingList.noStore}
                </Typography>
                <List disablePadding>
                  {section.items.map((item) => {
                    const quantity = formatItemQuantity(item)
                    return (
                      <ListItemButton key={item.id} onClick={() => toggle(item.id)} dense>
                        <Checkbox edge="start" checked={selected.has(item.id)} tabIndex={-1} disableRipple />
                        <ListItemText
                          primary={
                            <>
                              {quantity && (
                                <Box component="span" sx={{ fontWeight: 700, mr: 0.75 }}>
                                  {quantity}
                                </Box>
                              )}
                              {item.name}
                            </>
                          }
                        />
                      </ListItemButton>
                    )
                  })}
                </List>
              </Box>
            ))
          )}
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="contained" disabled={selected.size === 0 || copying} onClick={handleCopy}>
            {t.shoppingList.addSelected.replace('{count}', String(selected.size))}
          </Button>
        </Box>
      </Container>
      <Snackbar open={Boolean(errorMsg)} autoHideDuration={4000} onClose={() => setErrorMsg(null)}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>
      <MobileBottomNav value="shopping-list" />
    </Box>
  )
}
