import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useT } from '@/i18n/I18nContext'

interface RenameEntry {
  id: string
  oldName: string
  newName: string
  mergeIntoId: string | null
  mergeIntoName: string | null
  error: 'EMPTY_NAME' | 'NAME_TOO_LONG' | null
}

export default function IngredientBulkRename() {
  const { t } = useT()
  const text = t.settings.ingredientsSection

  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [wholeName, setWholeName] = useState(false)

  const [entries, setEntries] = useState<RenameEntry[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previewing, setPreviewing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [doneMessage, setDoneMessage] = useState('')

  const selectableEntries = (entries ?? []).filter((entry) => entry.error === null)
  const selectedEntries = selectableEntries.filter((entry) => selected.has(entry.id))
  const mergedCount = selectedEntries.filter((entry) => entry.mergeIntoId).length

  function resetPreview() {
    setEntries(null)
    setSelected(new Set())
    setDoneMessage('')
  }

  async function handlePreview() {
    setPreviewing(true)
    setError('')
    setDoneMessage('')

    try {
      const res = await fetch('/api/settings/ingredients/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ find, replace, wholeName }),
      })
      if (!res.ok) {
        setError(text.previewFailed)
        return
      }
      const data = (await res.json()) as { entries: RenameEntry[] }
      setEntries(data.entries)
      setSelected(new Set(data.entries.filter((entry) => entry.error === null).map((entry) => entry.id)))
    } catch {
      setError(text.previewFailed)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleApply() {
    setConfirmOpen(false)
    setApplying(true)
    setError('')

    try {
      const res = await fetch('/api/settings/ingredients/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ find, replace, wholeName, ingredientIds: selectedEntries.map((entry) => entry.id) }),
      })
      if (!res.ok) {
        setError(text.applyFailed)
        return
      }
      const data = (await res.json()) as { renamedCount: number; mergedCount: number }
      resetPreview()
      setDoneMessage(text.done(data.renamedCount, data.mergedCount))
    } catch {
      setError(text.applyFailed)
    } finally {
      setApplying(false)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = selectableEntries.length > 0 && selectedEntries.length === selectableEntries.length

  return (
    <Box sx={{ maxWidth: 'md' }}>
      <Card elevation={0}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {text.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {text.description}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {doneMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {doneMessage}
            </Alert>
          )}

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                size="small"
                label={text.findLabel}
                value={find}
                onChange={(event) => {
                  setFind(event.target.value)
                  resetPreview()
                }}
                slotProps={{ htmlInput: { maxLength: 300, autoCapitalize: 'none' } }}
              />
              <TextField
                fullWidth
                size="small"
                label={text.replaceLabel}
                value={replace}
                onChange={(event) => {
                  setReplace(event.target.value)
                  resetPreview()
                }}
                slotProps={{ htmlInput: { maxLength: 300, autoCapitalize: 'none' } }}
              />
            </Stack>

            <FormControlLabel
              control={
                <Checkbox
                  checked={wholeName}
                  onChange={(event) => {
                    setWholeName(event.target.checked)
                    resetPreview()
                  }}
                />
              }
              label={text.wholeNameLabel}
            />

            <Box>
              <Button
                variant="outlined"
                onClick={() => void handlePreview()}
                disabled={!find.trim() || previewing || applying}
                startIcon={previewing ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {previewing ? text.previewing : text.previewButton}
              </Button>
            </Box>
          </Stack>

          {entries && entries.length === 0 && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {text.noMatch}
            </Typography>
          )}

          {entries && entries.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">{text.matchCount(entries.length)}</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selectedEntries.length > 0 && !allSelected}
                      onChange={(event) =>
                        setSelected(event.target.checked ? new Set(selectableEntries.map((entry) => entry.id)) : new Set())
                      }
                    />
                  }
                  label={text.selectAll}
                />
              </Stack>

              <List dense disablePadding>
                {entries.map((entry) => (
                  <ListItem key={entry.id} disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={selected.has(entry.id)}
                        disabled={entry.error !== null}
                        onChange={() => toggle(entry.id)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${entry.oldName} → ${entry.newName || '∅'}`}
                      secondary={
                        entry.error === 'EMPTY_NAME'
                          ? text.errorEmptyName
                          : entry.error === 'NAME_TOO_LONG'
                            ? text.errorNameTooLong
                            : entry.mergeIntoName
                              ? text.mergeInto(entry.mergeIntoName)
                              : undefined
                      }
                      slotProps={{ secondary: { color: entry.error ? 'error' : 'text.secondary' } }}
                    />
                  </ListItem>
                ))}
              </List>

              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => setConfirmOpen(true)}
                disabled={selectedEntries.length === 0 || applying}
                startIcon={applying ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {applying ? text.applying : text.applyButton(selectedEntries.length)}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{text.confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {text.confirmMessage(selectedEntries.length - mergedCount, mergedCount)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{text.confirmCancel}</Button>
          <Button color="error" onClick={() => void handleApply()}>
            {text.applyButton(selectedEntries.length)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
