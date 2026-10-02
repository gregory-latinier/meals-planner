/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SettingsClient from '@/app/settings/SettingsClient'
import { I18nProvider } from '@/i18n/I18nContext'

jest.mock('@/components/AppTopBar', () => ({
  __esModule: true,
  default: () => null,
}))

function renderSettings() {
  return render(
    <I18nProvider>
      <SettingsClient />
    </I18nProvider>
  )
}

describe('SettingsClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('shows load error when initial settings request fails', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'boom' }),
    } as Response)

    renderSettings()

    expect(await screen.findByText('Could not load AI settings. Please try again.')).not.toBeNull()
  })

  it('loads settings and saves successfully', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: false, masked: null, updatedAt: null },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: false, masked: null, updatedAt: null },
        }),
      } as Response)

    renderSettings()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/ai')
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModel: 'gemini-free' }),
      })
    })

    expect(await screen.findByText('Settings saved.')).not.toBeNull()
  })

  it('renders a navigation control back to recipes', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        selectedModel: 'gemini-free',
        availableModels: ['gemini-free'],
        geminiApiKey: { configured: false, masked: null, updatedAt: null },
      }),
    } as Response)

    renderSettings()

    const backLink = await screen.findByRole('link', { name: 'Back to recipes' })
    expect(backLink.getAttribute('href')).toBe('/recipes')
  })

  it('shows save error when PATCH request fails', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: false, masked: null, updatedAt: null },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'nope' }),
      } as Response)

    renderSettings()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/ai')
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not save AI settings. Please try again.')).not.toBeNull()
  })

  it('sends gemini key when provided', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: true, masked: '••••••••1234', updatedAt: '2026-10-02T08:00:00.000Z' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: true, masked: '••••••••1234', updatedAt: '2026-10-02T08:00:00.000Z' },
        }),
      } as Response)

    renderSettings()

    await screen.findByText('Configured: ••••••••1234')

    fireEvent.change(screen.getByLabelText('Gemini API key'), { target: { value: 'my-key-xyz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModel: 'gemini-free', geminiApiKey: 'my-key-xyz' }),
      })
    })
  })

  it('sends null gemini key when remove key is clicked', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: true, masked: '••••••••9999', updatedAt: '2026-10-02T08:00:00.000Z' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selectedModel: 'gemini-free',
          availableModels: ['gemini-free'],
          geminiApiKey: { configured: false, masked: null, updatedAt: null },
        }),
      } as Response)

    renderSettings()

    await screen.findByText('Configured: ••••••••9999')

    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModel: 'gemini-free', geminiApiKey: null }),
      })
    })
  })
})
