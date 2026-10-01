/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RecipesClient from '@/app/recipes/RecipesClient'
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

interface MockRecipe {
  id: string
  title: string
  status: 'draft' | 'published'
  updatedAt: string
  imagePath: string | null
  tags: Array<{ id: string; name: string }>
}

function makeFetchResponse(recipes: MockRecipe[]) {
  return {
    ok: true,
    json: async () => ({ recipes }),
  } as Response
}

function renderRecipes() {
  return render(
    <I18nProvider>
      <RecipesClient />
    </I18nProvider>
  )
}

describe('RecipesClient', () => {
  beforeEach(() => {
    pushMock.mockReset()
    window.localStorage.clear()
    global.fetch = jest.fn().mockResolvedValue(
      makeFetchResponse([
        {
          id: 'rec-1',
          title: 'Tomato Soup',
          status: 'draft',
          updatedAt: '2026-01-02T00:00:00.000Z',
          imagePath: null,
          tags: [{ id: 'tag-1', name: 'quick' }],
        },
      ])
    ) as unknown as typeof fetch
  })

  it('defaults to list view and keeps default recipe sort request', async () => {
    renderRecipes()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/recipes?sortBy=updatedAt&order=desc')
    })

    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('persists recipe page view preference in localStorage', async () => {
    renderRecipes()

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }))

    await waitFor(() => {
      expect(window.localStorage.getItem('mp_recipes_view')).toBe('grid')
    })
  })

  it('hydrates recipe page view preference from localStorage', async () => {
    window.localStorage.setItem('mp_recipes_view', 'grid')

    renderRecipes()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed')).toBe('true')
    })
  })

  it('shows image fallback when recipe has no image', async () => {
    renderRecipes()

    await screen.findByText('No image')
    expect(screen.getAllByText('No image')).toHaveLength(1)
    expect(screen.queryByRole('img', { name: 'Tomato Soup' })).toBeNull()
  })

  it('falls back when recipe image fails to load', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeFetchResponse([
        {
          id: 'rec-2',
          title: 'Pasta',
          status: 'published',
          updatedAt: '2026-01-02T00:00:00.000Z',
          imagePath: '/uploads/recipes/broken.jpg',
          tags: [],
        },
      ])
    ) as unknown as typeof fetch

    renderRecipes()

    const image = await screen.findByRole('img', { name: 'Pasta' })
    fireEvent.error(image)

    await screen.findByText('No image')
    expect(screen.getAllByText('No image')).toHaveLength(1)
    expect(screen.queryByRole('img', { name: 'Pasta' })).toBeNull()
  })

  it('does not render published status text for published recipes', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeFetchResponse([
        {
          id: 'rec-3',
          title: 'Stew',
          status: 'published',
          updatedAt: '2026-01-02T00:00:00.000Z',
          imagePath: null,
          tags: [],
        },
      ])
    ) as unknown as typeof fetch

    renderRecipes()

    await screen.findByText('Stew')
    expect(screen.queryByText('Published')).toBeNull()
  })

  it('renders draft status text for draft recipes', async () => {
    renderRecipes()

    await screen.findByText('Tomato Soup')
    expect(screen.getByText('Draft')).not.toBeNull()
  })

  it('uses square aspect ratio for recipe cards in grid view', async () => {
    renderRecipes()

    await screen.findByText('Tomato Soup')
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }))

    const gridCard = await screen.findByTestId('recipe-grid-card')
    expect(window.getComputedStyle(gridCard).aspectRatio).toBe('1/1')
  })
})
