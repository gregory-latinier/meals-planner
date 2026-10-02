/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RecipeViewClient from '@/app/recipes/[recipeId]/RecipeViewClient'
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

function renderClient(recipeId = 'c123456789012345678901234') {
  return render(
    <I18nProvider>
      <RecipeViewClient recipeId={recipeId} />
    </I18nProvider>
  )
}

describe('RecipeViewClient', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('renders recipe sections with fallback and navigates via actions', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recipe: {
          id: 'c123456789012345678901234',
          title: '',
          status: 'draft',
          servings: null,
          prepMinutes: null,
          cookMinutes: null,
          sourceUrl: null,
          imagePath: null,
          cookbook: null,
          tags: [],
          ingredientRows: [],
          instructions: [],
        },
      }),
    } as Response) as unknown as typeof fetch

    renderClient()

    await screen.findByText('Untitled recipe')
    expect(screen.getByText('No ingredients added yet.')).not.toBeNull()
    expect(screen.getByText('No instructions added yet.')).not.toBeNull()
    expect(screen.getByText('No image')).not.toBeNull()

    expect(screen.getByTestId('recipe-view-image-actions')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Back to recipes' }))
    expect(pushMock).toHaveBeenCalledWith('/recipes')

    fireEvent.click(screen.getByRole('button', { name: 'Edit recipe' }))
    expect(pushMock).toHaveBeenCalledWith('/recipes/c123456789012345678901234/edit')
  })

  it('shows load error when GET /api/recipes/[recipeId] fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Recipe not found.' }),
    } as Response) as unknown as typeof fetch

    renderClient()

    await screen.findByText('Could not load recipe. Please try again.')
  })

  it('renders metadata chips and source URL when provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recipe: {
          id: 'c123456789012345678901234',
          title: 'Pasta',
          status: 'published',
          servings: 4,
          prepMinutes: 15,
          cookMinutes: 20,
          sourceUrl: 'https://example.com/pasta',
          imagePath: null,
          cookbook: { id: 'cb-1', name: 'Weeknight' },
          tags: [{ id: 't1', name: 'quick' }],
          ingredientRows: [
            {
              id: 'ir1',
              kind: 'item',
              heading: null,
              quantity: '1',
              note: null,
              ingredient: { id: 'i1', name: 'Onion' },
              unit: null,
            },
            {
              id: 'ir2',
              kind: 'item',
              heading: null,
              quantity: '1 1/2',
              note: null,
              ingredient: { id: 'i2', name: 'cups flour' },
              unit: null,
            },
          ],
          instructions: [{ kind: 'item', text: 'Cook gently' }],
        },
      }),
    } as Response) as unknown as typeof fetch

    renderClient()

    await screen.findByText('Pasta')

    expect(screen.queryByText('Published')).toBeNull()
    expect(screen.getByText('Servings: 4')).not.toBeNull()
    expect(screen.getByText('Prep: 15 min')).not.toBeNull()
    expect(screen.getByText('Cook: 20 min')).not.toBeNull()
    expect(screen.getByText('Weeknight')).not.toBeNull()
    expect(screen.getByText('quick')).not.toBeNull()

    const source = screen.getByRole('link', { name: 'https://example.com/pasta' })
    expect(source.getAttribute('href')).toBe('https://example.com/pasta')

    await waitFor(() => {
      expect(screen.getByText(/Onion/)).not.toBeNull()
      expect(screen.getByText(/1 1\/2 cups flour/)).not.toBeNull()
      expect(screen.getByText(/Cook gently/)).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }))

    await waitFor(() => {
      expect(screen.getByText('Servings: 5')).not.toBeNull()
      expect(screen.getByText(/1.25 Onion/)).not.toBeNull()
      expect(screen.getByText(/1 7\/8 cups flour/)).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Decrease servings' }))

    await waitFor(() => {
      expect(screen.getByText('Servings: 4')).not.toBeNull()
      expect(screen.getByText(/1 Onion/)).not.toBeNull()
      expect(screen.getByText(/1 1\/2 cups flour/)).not.toBeNull()
    })
  })

  it('shows draft chip and disables servings decrement at minimum', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recipe: {
          id: 'c123456789012345678901234',
          title: 'Soup',
          status: 'draft',
          servings: 1,
          prepMinutes: null,
          cookMinutes: null,
          sourceUrl: null,
          imagePath: null,
          cookbook: null,
          tags: [],
          ingredientRows: [
            {
              id: 'ir1',
              kind: 'item',
              heading: null,
              quantity: '2',
              note: null,
              ingredient: { id: 'i1', name: 'carrots' },
              unit: null,
            },
          ],
          instructions: [{ kind: 'item', text: 'Simmer' }],
        },
      }),
    } as Response) as unknown as typeof fetch

    renderClient()

    await screen.findByText('Soup')
    expect(screen.getByText('Draft')).not.toBeNull()

    const decreaseButton = screen.getByRole('button', { name: 'Decrease servings' })
    expect((decreaseButton as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }))
    await waitFor(() => {
      expect(screen.getByText('Servings: 2')).not.toBeNull()
      expect(screen.getByText(/4 carrots/)).not.toBeNull()
    })
  })

  it('restarts instruction numbering after each heading', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recipe: {
          id: 'c123456789012345678901234',
          title: 'Rougail saucisse',
          status: 'published',
          servings: null,
          prepMinutes: null,
          cookMinutes: null,
          sourceUrl: null,
          imagePath: null,
          cookbook: null,
          tags: [],
          ingredientRows: [],
          instructions: [
            { kind: 'heading', text: 'Préparation' },
            { kind: 'item', text: 'Épluchez l’ail, l’oignon et le gingembre.' },
            { kind: 'item', text: 'Coupez les saucisses en rondelles.' },
            { kind: 'heading', text: 'Cuisson' },
            { kind: 'item', text: 'Ajoutez ensuite l’ail pressé.' },
            { kind: 'item', text: 'Laissez mijoter.' },
          ],
        },
      }),
    } as Response) as unknown as typeof fetch

    renderClient()

    await screen.findByText('Préparation')
    expect(screen.getByText('1. Épluchez l’ail, l’oignon et le gingembre.')).not.toBeNull()
    expect(screen.getByText('2. Coupez les saucisses en rondelles.')).not.toBeNull()
    await screen.findByText('Cuisson')
    expect(screen.getByText('1. Ajoutez ensuite l’ail pressé.')).not.toBeNull()
    expect(screen.getByText('2. Laissez mijoter.')).not.toBeNull()
  })
})
