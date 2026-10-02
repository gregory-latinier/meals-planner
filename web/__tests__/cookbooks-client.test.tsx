/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CookbooksClient from '@/app/cookbooks/CookbooksClient'
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

function renderCookbooks() {
  return render(
    <I18nProvider>
      <CookbooksClient />
    </I18nProvider>
  )
}

describe('CookbooksClient', () => {
  beforeEach(() => {
    pushMock.mockReset()
    window.localStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cookbooks: [
          {
            id: 'cb-1',
            name: 'Desserts',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            recipeCount: 2,
          },
        ],
      }),
    } as Response) as unknown as typeof fetch
  })

  it('defaults to grid view and keeps default cookbook sort request', async () => {
    renderCookbooks()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cookbooks?sortBy=updatedAt&order=desc')
    })

    expect(screen.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('does not render page subtitle', async () => {
    renderCookbooks()

    await screen.findByRole('button', { name: 'Grid' })
    expect(screen.queryByText('Group your recipes by theme, season, or favorites.')).toBeNull()
  })

  it('persists cookbook page view preference in localStorage', async () => {
    renderCookbooks()

    fireEvent.click(screen.getByRole('button', { name: 'List' }))

    await waitFor(() => {
      expect(window.localStorage.getItem('mp_cookbooks_view')).toBe('list')
    })
  })

  it('hydrates cookbook page view preference from localStorage', async () => {
    window.localStorage.setItem('mp_cookbooks_view', 'list')

    renderCookbooks()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true')
    })
  })
})
