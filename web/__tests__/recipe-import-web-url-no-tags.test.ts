import { lookup } from 'node:dns/promises'
import { prisma } from '@/lib/prisma'
import { importRecipeFromWebUrl } from '@/lib/recipe-import-web-url'

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>
const mockedTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>

describe('recipe import web url - no tags persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GEMINI_API_KEY = 'gem-key-test'
    mockedLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as unknown as Awaited<ReturnType<typeof lookup>>)
  })

  it('ignores AI tags when creating imported recipe', async () => {
    const recipeCreate = jest.fn().mockResolvedValue({ id: 'recipe-1' })
    const recipeTagUpsert = jest.fn()

    mockedTransaction.mockImplementation(async (fn) => {
      const tx = {
        ingredient: {
          upsert: jest.fn().mockResolvedValue({ id: 'ing-1' }),
        },
        unit: {
          upsert: jest.fn().mockResolvedValue({ id: 'unit-1' }),
        },
        recipeTag: {
          upsert: recipeTagUpsert,
        },
        recipe: {
          create: recipeCreate,
        },
      }

      return fn(tx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) as ReturnType<
        typeof prisma.$transaction
      >
    })

    const fetchMock = jest.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url === 'https://example.com/recipe') {
        return Promise.resolve(
          new Response('<html><head><title>Recipe</title></head><body>Simple recipe</body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        )
      }

      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          title: 'Imported soup',
                          servings: 2,
                          prepMinutes: 10,
                          cookMinutes: 20,
                          instructions: [{ kind: 'item', text: 'Mix and cook' }],
                          ingredientRows: [{ kind: 'item', name: 'Tomato', quantity: '2', unit: 'pcs' }],
                          tags: ['quick', 'vegan'],
                          selectedImageUrl: null,
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }
          )
        )
      }

      return Promise.reject(new Error(`Unexpected URL in test: ${url}`))
    }) as unknown as typeof fetch

    await importRecipeFromWebUrl(
      {
        householdId: 'house-1',
        sourceUrl: 'https://example.com/recipe',
        model: 'GEMINI_FREE',
        householdGeminiApiKeyEncrypted: null,
      },
      { fetchImpl: fetchMock }
    )

    expect(recipeTagUpsert).not.toHaveBeenCalled()
    expect(recipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          tagsOnRecipes: expect.anything(),
        }),
      })
    )
  })
})
