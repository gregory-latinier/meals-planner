/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import RecipeEditorClient from '@/app/recipes/[recipeId]/edit/RecipeEditorClient'
import { I18nProvider } from '@/i18n/I18nContext'

const RECIPE_ID = 'r123456789012345678901234'
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

function okJson(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

function buildRecipeResponse() {
  return {
    recipe: {
      title: 'Tomato Soup',
      cookbook: null,
      servings: null,
      prepMinutes: null,
      cookMinutes: null,
      sourceUrl: null,
      imagePath: null,
      imageMimeType: null,
      imageWidth: null,
      imageHeight: null,
      imageSizeBytes: null,
      tags: [],
      ingredientRows: [
        {
          id: 'ing-row-1',
          kind: 'item',
          heading: null,
          ingredient: null,
          quantity: null,
          unit: null,
          note: null,
        },
      ],
      instructions: [{ kind: 'item', text: '' }],
    },
  }
}

function setupFetch() {
  global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method ?? 'GET'

    if (url === `/api/recipes/${RECIPE_ID}` && method === 'GET') {
      return Promise.resolve(okJson(buildRecipeResponse()))
    }

    if (url === '/api/cookbooks?sortBy=name&order=asc' && method === 'GET') {
      return Promise.resolve(okJson({ cookbooks: [] }))
    }

    if (url === `/api/recipes/${RECIPE_ID}` && method === 'PATCH') {
      return Promise.resolve(okJson({ recipe: { id: RECIPE_ID } }))
    }

    return Promise.resolve({
      ok: false,
      json: async () => ({ error: 'Unhandled request in test' }),
    } as Response)
  }) as unknown as typeof fetch
}

function renderEditor() {
  return render(
    <I18nProvider>
      <RecipeEditorClient recipeId={RECIPE_ID} />
    </I18nProvider>
  )
}

function getInstructionRowToggleContainer(): HTMLElement {
  const match = document.querySelector('[data-testid^="instruction-row-kind-toggle-"]')
  if (!match) {
    throw new Error('Instruction row toggle container not found')
  }
  return match as HTMLElement
}

describe('RecipeEditorClient', () => {
  beforeEach(() => {
    pushMock.mockReset()
    setupFetch()
  })

  it('renders floating save action area with both save buttons', async () => {
    renderEditor()

    await screen.findByDisplayValue('Tomato Soup')

    const actionArea = screen.getByTestId('recipe-editor-save-actions')
    expect(actionArea).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Save draft' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Publish' })).not.toBeNull()
  })

  it('keeps save draft and publish actions wired to submit logic', async () => {
    renderEditor()

    await screen.findByDisplayValue('Tomato Soup')

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/recipes')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    await waitFor(() => {
      const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(([input, init]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        return url === `/api/recipes/${RECIPE_ID}` && (init as RequestInit | undefined)?.method === 'PATCH'
      })

      expect(patchCalls).toHaveLength(2)

      const firstBody = JSON.parse(String((patchCalls[0][1] as RequestInit).body)) as { publish?: boolean }
      const secondBody = JSON.parse(String((patchCalls[1][1] as RequestInit).body)) as { publish?: boolean }

      expect(firstBody.publish).toBe(false)
      expect(secondBody.publish).toBe(true)
    })
  })

  it('creates cookbook from modal dialog and selects it', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method ?? 'GET'

      if (url === `/api/recipes/${RECIPE_ID}` && method === 'GET') {
        return Promise.resolve(okJson(buildRecipeResponse()))
      }

      if (url === '/api/cookbooks?sortBy=name&order=asc' && method === 'GET') {
        return Promise.resolve(okJson({ cookbooks: [] }))
      }

      if (url === '/api/cookbooks' && method === 'POST') {
        return Promise.resolve(okJson({ cookbook: { id: 'cb-1', name: 'Weeknight' } }))
      }

      if (url === `/api/recipes/${RECIPE_ID}` && method === 'PATCH') {
        return Promise.resolve(okJson({ recipe: { id: RECIPE_ID } }))
      }

      return Promise.resolve({ ok: false, json: async () => ({ error: 'Unhandled request in test' }) } as Response)
    })

    renderEditor()

    await screen.findByDisplayValue('Tomato Soup')

    fireEvent.click(screen.getAllByRole('button', { name: 'Create cookbook' })[0])

    const nameInput = await screen.findByLabelText('Cookbook name')
    fireEvent.change(nameInput, { target: { value: 'Weeknight' } })
    fireEvent.submit(nameInput.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.queryByLabelText('Cookbook name')).toBeNull()
    })

    const comboBoxes = screen.getAllByRole('combobox')
    expect(comboBoxes.some((node) => node.textContent?.includes('Weeknight'))).toBe(true)
  })

  it('shows cookbook modal validation error, autofocuses input, and supports cancel', async () => {
    renderEditor()

    await screen.findByDisplayValue('Tomato Soup')

    fireEvent.click(screen.getAllByRole('button', { name: 'Create cookbook' })[0])

    const nameInput = await screen.findByLabelText('Cookbook name')
    expect(document.activeElement).toBe(nameInput)

    fireEvent.submit(nameInput.closest('form') as HTMLFormElement)
    expect(await screen.findByText('Cookbook name is required.')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByLabelText('Cookbook name')).toBeNull()
    })
  })

  it('switches row kind labels using toggles for ingredients and instructions', async () => {
    renderEditor()

    await screen.findByDisplayValue('Tomato Soup')

    expect(within(screen.getByTestId('ingredient-row-kind-toggle-ing-row-1')).getByText('Ingredient')).not.toBeNull()
    expect(within(getInstructionRowToggleContainer()).getByText('Text')).not.toBeNull()

    const ingredientToggle = screen.getByTestId('ingredient-row-kind-toggle-ing-row-1').querySelector('input')
    expect(ingredientToggle).not.toBeNull()
    fireEvent.click(ingredientToggle as HTMLInputElement)

    await waitFor(() => {
      expect(within(screen.getByTestId('ingredient-row-kind-toggle-ing-row-1')).getByText('Heading')).not.toBeNull()
    })
  })
})
