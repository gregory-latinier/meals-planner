import { NextRequest } from 'next/server'
import { GET as getTags, POST as postTag } from '@/app/api/recipe-tags/route'
import { GET as getIngredients, POST as postIngredient } from '@/app/api/ingredients/route'
import { GET as getUnits, POST as postUnit } from '@/app/api/units/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipeTag: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    ingredient: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    ingredientTranslation: {
      upsert: jest.fn(),
    },
    unit: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>

describe('taxonomy APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tags search uses contains on normalized query', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    ;(prisma.recipeTag.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'tag-1', name: 'Quick' }])

    const req = new NextRequest('http://localhost/api/recipe-tags?q=qui')
    const res = await getTags(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(prisma.recipeTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ householdId: 'house-1' }),
      })
    )
    expect(body.tags).toEqual([{ id: 'tag-1', name: 'Quick' }])
  })

  it('GET /api/recipe-tags returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/recipe-tags?q=qui')
    const res = await getTags(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('tag POST reuses/creates normalized tag', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    ;(prisma.recipeTag.upsert as jest.Mock).mockResolvedValueOnce({ id: 'tag-1', name: 'Quick' })

    const req = new NextRequest('http://localhost/api/recipe-tags', {
      method: 'POST',
      body: JSON.stringify({ name: ' Quick ' }),
    })
    const res = await postTag(req)

    expect(res.status).toBe(200)
    expect(prisma.recipeTag.upsert).toHaveBeenCalled()
  })

  it('POST /api/recipe-tags returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/recipe-tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'quick' }),
    })
    const res = await postTag(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('POST /api/recipe-tags returns 400 when name is empty', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const req = new NextRequest('http://localhost/api/recipe-tags', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    })
    const res = await postTag(req)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Tag name is required.' })
  })

  it('ingredient POST supports locale translation upsert', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    ;(prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        ingredient: {
          upsert: jest.fn().mockResolvedValue({ id: 'ing-1' }),
          findUnique: jest.fn().mockResolvedValue({ id: 'ing-1', name: 'Tomato', translations: [{ locale: 'fr', name: 'Tomate' }] }),
        },
        ingredientTranslation: {
          upsert: jest.fn().mockResolvedValue({ id: 'tr-1' }),
        },
      }
      return fn(tx)
    })

    const req = new NextRequest('http://localhost/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tomate', locale: 'fr' }),
    })
    const res = await postIngredient(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ingredient: expect.objectContaining({ id: 'ing-1', name: 'Tomato' }),
    })
  })

  it('ingredient GET returns household scoped search results', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'ing-1', name: 'Tomato', translations: [] }])

    const req = new NextRequest('http://localhost/api/ingredients?q=tom&locale=en')
    const res = await getIngredients(req)
    expect(res.status).toBe(200)
  })

  it('GET /api/ingredients returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/ingredients?q=tom&locale=en')
    const res = await getIngredients(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('POST /api/ingredients returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Tomate', locale: 'fr' }),
    })
    const res = await postIngredient(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('POST /api/ingredients returns 400 when name is empty', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const req = new NextRequest('http://localhost/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    })
    const res = await postIngredient(req)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Ingredient name is required.' })
  })

  it('unit GET/POST support inline create and search', async () => {
    mockedGetSession
      .mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      .mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    ;(prisma.unit.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'unit-1', name: 'g' }])
    ;(prisma.unit.upsert as jest.Mock).mockResolvedValueOnce({ id: 'unit-2', name: 'tbsp' })

    const getRes = await getUnits(new NextRequest('http://localhost/api/units?q=g'))
    const postRes = await postUnit(
      new NextRequest('http://localhost/api/units', {
        method: 'POST',
        body: JSON.stringify({ name: 'tbsp' }),
      })
    )

    expect(getRes.status).toBe(200)
    expect(postRes.status).toBe(200)
  })

  it('GET /api/units returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const res = await getUnits(new NextRequest('http://localhost/api/units?q=g'))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('POST /api/units returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const res = await postUnit(
      new NextRequest('http://localhost/api/units', {
        method: 'POST',
        body: JSON.stringify({ name: 'tbsp' }),
      })
    )

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('POST /api/units returns 400 when name is empty', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const res = await postUnit(
      new NextRequest('http://localhost/api/units', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Unit name is required.' })
  })
})
