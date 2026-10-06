import { NextRequest } from 'next/server'
import { POST } from '@/app/api/recipes/import/text/route'
import { prisma } from '@/lib/prisma'
import { importRecipeFromText } from '@/lib/recipe-import-text'
import { getSession } from '@/lib/session'

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}))

jest.mock('@/lib/recipe-import-text', () => ({
  importRecipeFromText: jest.fn(),
  validateImportText: (value: unknown) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 30000) return null
    return trimmed
  },
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>
const mockedImportRecipeFromText = importRecipeFromText as jest.MockedFunction<typeof importRecipeFromText>

describe('recipes import text API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({ importText: 'Ingredients: tomatoes' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('returns 400 for invalid text payload', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const req = new NextRequest('http://localhost/api/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({ importText: '   ' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid import text.' })
  })

  it('returns imported recipe id on success and passes household key', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedQueryRaw.mockResolvedValueOnce([
      { recipeExtractionModel: 'GEMINI_FREE', geminiApiKeyEncrypted: 'encrypted:abc' },
    ] as never)
    mockedImportRecipeFromText.mockResolvedValueOnce({ recipeId: 'recipe-1' })

    const req = new NextRequest('http://localhost/api/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({ importText: 'Ingredients: 2 tomatoes' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      recipe: { id: 'recipe-1' },
    })
    expect(mockedImportRecipeFromText).toHaveBeenCalledWith({
      householdId: 'house-1',
      importText: 'Ingredients: 2 tomatoes',
      model: 'GEMINI_FREE',
      householdGeminiApiKeyEncrypted: 'encrypted:abc',
    })
  })

  it('returns 400 when AI extraction fails', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedQueryRaw.mockResolvedValueOnce([
      { recipeExtractionModel: 'GEMINI_FREE', geminiApiKeyEncrypted: null },
    ] as never)
    mockedImportRecipeFromText.mockRejectedValueOnce(new Error('AI extraction failed.'))

    const req = new NextRequest('http://localhost/api/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({ importText: 'Ingredients: 2 tomatoes' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'AI extraction failed.' })
  })
})
