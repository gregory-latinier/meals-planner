/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import InstagramImportClient from '@/app/recipes/import/instagram/InstagramImportClient'
import { I18nProvider } from '@/i18n/I18nContext'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

jest.mock('@/components/AppTopBar', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/MobileBottomNav', () => ({
  __esModule: true,
  default: () => null,
}))

function renderImport(initialSourceUrl: string, initialError: 'required' | 'invalidUrl' | 'notInstagramHost' | 'unsupportedInstagramPath' | null = null) {
  return render(
    <I18nProvider>
      <InstagramImportClient initialSourceUrl={initialSourceUrl} initialError={initialError} />
    </I18nProvider>
  )
}

describe('InstagramImportClient', () => {
  beforeEach(() => {
    pushMock.mockReset()
    global.fetch = jest.fn()
  })

  it('prefills shared URL and imports via existing web-url API', async () => {
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipe: { id: 'rec-ig-1' }, warnings: [] }),
    } as Response)

    renderImport('https://www.instagram.com/reel/abc123/')

    const input = screen.getByLabelText('Instagram URL') as HTMLInputElement
    expect(input.value).toBe('https://www.instagram.com/reel/abc123/')

    fireEvent.click(screen.getByRole('button', { name: 'Import recipe' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/recipes/import/web-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceUrl: 'https://www.instagram.com/reel/abc123/' }),
      })
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/recipes/rec-ig-1/edit')
    })
  })

  it('shows localized Instagram validation error for non-Instagram hosts', async () => {
    renderImport('https://example.com/recipe')

    fireEvent.click(screen.getByRole('button', { name: 'Import recipe' }))

    expect(await screen.findByText('Please use an Instagram URL.')).not.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('cancels import and routes back to recipes', async () => {
    renderImport('https://www.instagram.com/reel/abc123/')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(pushMock).toHaveBeenCalledWith('/recipes')
  })
})
