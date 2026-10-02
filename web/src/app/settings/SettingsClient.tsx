'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AppTopBar from '@/components/AppTopBar'
import { useT } from '@/i18n/I18nContext'

type SelectedModel = 'gemini-free'

interface AiSettingsResponse {
  selectedModel: SelectedModel
  availableModels: SelectedModel[]
  geminiApiKey?: {
    configured: boolean
    masked: string | null
    updatedAt: string | null
  }
}

export default function SettingsClient() {
  const { t } = useT()
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('gemini-free')
  const [availableModels, setAvailableModels] = useState<SelectedModel[]>(['gemini-free'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('')
  const [geminiApiKeyConfigured, setGeminiApiKeyConfigured] = useState(false)
  const [geminiApiKeyMasked, setGeminiApiKeyMasked] = useState<string | null>(null)
  const [geminiApiKeyUpdatedAt, setGeminiApiKeyUpdatedAt] = useState<string | null>(null)
  const [removeGeminiApiKey, setRemoveGeminiApiKey] = useState(false)

  useEffect(() => {
    let active = true

    async function loadAiSettings() {
      setLoading(true)
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
        const nextGeminiApiKey = data.geminiApiKey

        setSelectedModel(nextSelected)
        setAvailableModels(nextAvailable.length > 0 ? nextAvailable : ['gemini-free'])
        setGeminiApiKeyConfigured(Boolean(nextGeminiApiKey?.configured))
        setGeminiApiKeyMasked(nextGeminiApiKey?.masked ?? null)
        setGeminiApiKeyUpdatedAt(nextGeminiApiKey?.updatedAt ?? null)
        setGeminiApiKeyInput('')
        setRemoveGeminiApiKey(false)
      } catch {
        if (active) setLoadError(t.settings.errors.loadFailed)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAiSettings()

    return () => {
      active = false
    }
  }, [t.settings.errors.loadFailed])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      const payload: { selectedModel: SelectedModel; geminiApiKey?: string | null } = { selectedModel }
      if (removeGeminiApiKey) {
        payload.geminiApiKey = null
      } else if (geminiApiKeyInput.trim().length > 0) {
        payload.geminiApiKey = geminiApiKeyInput.trim()
      }

      const res = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as Partial<AiSettingsResponse>

      if (!res.ok || data.selectedModel !== 'gemini-free') {
        setSaveError(t.settings.errors.saveFailed)
        return
      }

      setGeminiApiKeyConfigured(Boolean(data.geminiApiKey?.configured))
      setGeminiApiKeyMasked(data.geminiApiKey?.masked ?? null)
      setGeminiApiKeyUpdatedAt(data.geminiApiKey?.updatedAt ?? null)
      setGeminiApiKeyInput('')
      setRemoveGeminiApiKey(false)
      setSaveSuccess(true)
    } catch {
      setSaveError(t.settings.errors.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppTopBar />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {t.settings.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t.settings.subtitle}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Button component={Link} href="/recipes" variant="outlined">
            {t.settings.backToApp}
          </Button>
        </Box>

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

            <FormControl fullWidth size="small" disabled={loading || saving}>
              <InputLabel id="settings-ai-model-label">{t.settings.aiSection.modelLabel}</InputLabel>
              <Select
                labelId="settings-ai-model-label"
                label={t.settings.aiSection.modelLabel}
                value={selectedModel}
                onChange={(event) => {
                  setSelectedModel(event.target.value as SelectedModel)
                  setSaveSuccess(false)
                }}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model === 'gemini-free' ? t.settings.aiSection.models.geminiFree : model}
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
                disabled={loading || saving}
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
                  disabled={loading || saving || !geminiApiKeyConfigured}
                >
                  {t.settings.aiSection.removeKeyButton}
                </Button>
              </Box>
            </Stack>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || saving}
              >
                {t.settings.saveButton}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
