import { NextRequest } from 'next/server'
import { GET as recipesGet, POST as recipesPost } from '@/app/api/recipes/route'
import { POST as createDraftPost } from '@/app/api/recipes/draft/route'
import { GET as recipeByIdGet, PATCH as recipeByIdPatch, DELETE as recipeDelete } from '@/app/api/recipes/[recipeId]/route'
import { PATCH as recipeAutosavePatch } from '@/app/api/recipes/[recipeId]/autosave/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    cookbook: {
      findFirst: jest.fn(),
    },
    ingredient: {
      findMany: jest.fn(),
    },
    unit: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedRecipeFindMany = prisma.recipe.findMany as jest.MockedFunction<typeof prisma.recipe.findMany>
const mockedRecipeCreate = prisma.recipe.create as jest.MockedFunction<typeof prisma.recipe.create>
const mockedRecipeFindFirst = prisma.recipe.findFirst as jest.MockedFunction<typeof prisma.recipe.findFirst>
const mockedRecipeDelete = prisma.recipe.delete as jest.MockedFunction<typeof prisma.recipe.delete>
const mockedTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>

const VALID_RECIPE_ID = 'c123456789012345678901234'

describe('recipes APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/recipes returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/recipes')
    const res = await recipesGet(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('GET /api/recipes returns recipes list for household', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeFindMany.mockResolvedValueOnce([
      {
        id: 'rec-1',
        householdId: 'house-1',
        title: 'Tomato Soup',
        status: 'DRAFT',
        servings: null,
        prepMinutes: 10,
        cookMinutes: 20,
        sourceUrl: null,
        imagePath: '/uploads/recipes/soup.jpg',
        imageMimeType: null,
        imageWidth: null,
        imageHeight: null,
        imageSizeBytes: null,
        draftSavedAt: null,
        lastAutosavedAt: null,
        autosaveVersion: 0,
        publishedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        cookbook: null,
        tagsOnRecipes: [{ tag: { id: 'tag-1', name: 'quick' } }],
        _count: { ingredientRows: 3 },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.recipe.findMany>>)

    const req = new NextRequest('http://localhost/api/recipes?sortBy=title&order=asc')
    const res = await recipesGet(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.recipes[0]).toEqual(
      expect.objectContaining({
        id: 'rec-1',
        title: 'Tomato Soup',
        status: 'draft',
        imagePath: '/uploads/recipes/soup.jpg',
        tags: [{ id: 'tag-1', name: 'quick' }],
        ingredientRowCount: 3,
      })
    )
  })

  it('POST /api/recipes validates title required', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const req = new NextRequest('http://localhost/api/recipes', {
      method: 'POST',
      body: JSON.stringify({
        title: '   ',
        instructions: [],
        ingredientRows: [],
      }),
    })

    const res = await recipesPost(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Recipe title is required.' })
  })

  it('POST /api/recipes/draft creates draft', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeCreate.mockResolvedValueOnce({
      id: 'rec-1',
      status: 'DRAFT',
      autosaveVersion: 0,
      draftSavedAt: new Date('2026-01-01T00:00:00.000Z'),
      lastAutosavedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as Awaited<ReturnType<typeof prisma.recipe.create>>)

    const res = await createDraftPost()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      recipe: expect.objectContaining({ id: 'rec-1', status: 'draft' }),
    })
  })

  it('POST /api/recipes/draft returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const res = await createDraftPost()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('GET /api/recipes/[id] returns 400 for invalid id', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    const req = new NextRequest('http://localhost/api/recipes/not-cuid')

    const res = await recipeByIdGet(req, { params: Promise.resolve({ recipeId: 'not-cuid' }) })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid recipeId.' })
  })

  it('GET /api/recipes/[id] returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)
    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}`)

    const res = await recipeByIdGet(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('PATCH /api/recipes/[id]/autosave saves draft snapshot', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeFindFirst.mockResolvedValueOnce({
      id: VALID_RECIPE_ID,
      autosaveVersion: 0,
    } as Awaited<ReturnType<typeof prisma.recipe.findFirst>>)

    mockedTransaction.mockImplementationOnce(async (fn) => {
      const tx = {
        cookbook: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        ingredient: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        unit: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        recipeTag: {
          upsert: jest.fn().mockResolvedValue({ id: 'tag-1' }),
        },
        recipeTagOnRecipe: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        recipeIngredientRow: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        recipe: {
          update: jest.fn().mockResolvedValue({
            id: VALID_RECIPE_ID,
            autosaveVersion: 1,
            draftSavedAt: new Date('2026-01-01T00:00:00.000Z'),
            lastAutosavedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        },
      }

      return fn(tx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) as ReturnType<typeof prisma.$transaction>
    })

    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}/autosave`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: '',
        instructions: [],
        ingredientRows: [],
        tags: [],
      }),
    })

    const res = await recipeAutosavePatch(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      recipe: expect.objectContaining({ id: VALID_RECIPE_ID, autosaveVersion: 1 }),
    })
  })

  it('PATCH /api/recipes/[id]/autosave returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}/autosave`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: '',
        instructions: [],
        ingredientRows: [],
        tags: [],
      }),
    })

    const res = await recipeAutosavePatch(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('PATCH /api/recipes/[id]/autosave returns 400 for invalid payload', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeFindFirst.mockResolvedValueOnce({
      id: VALID_RECIPE_ID,
      autosaveVersion: 0,
    } as Awaited<ReturnType<typeof prisma.recipe.findFirst>>)

    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}/autosave`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: '',
        instructions: 'not-an-array',
        ingredientRows: [],
        tags: [],
      }),
    })

    const res = await recipeAutosavePatch(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Instructions must be an array.' })
  })

  it('PATCH /api/recipes/[id] allows draft save with empty title when publish=false', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeFindFirst
      .mockResolvedValueOnce({ id: VALID_RECIPE_ID } as Awaited<ReturnType<typeof prisma.recipe.findFirst>>)
      .mockResolvedValueOnce({
        id: VALID_RECIPE_ID,
        title: '',
        status: 'DRAFT',
        servings: null,
        prepMinutes: null,
        cookMinutes: null,
        sourceUrl: null,
        instructions: [],
        imagePath: null,
        imageMimeType: null,
        imageWidth: null,
        imageHeight: null,
        imageSizeBytes: null,
        draftSavedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastAutosavedAt: new Date('2026-01-01T00:00:00.000Z'),
        autosaveVersion: 1,
        publishedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        cookbook: null,
        ingredientRows: [],
        tagsOnRecipes: [],
      } as unknown as Awaited<ReturnType<typeof prisma.recipe.findFirst>>)

    mockedTransaction.mockImplementationOnce(async (fn) => {
      const tx = {
        cookbook: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        ingredient: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        unit: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        recipeTag: {
          upsert: jest.fn(),
        },
        recipeTagOnRecipe: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        recipeIngredientRow: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        recipe: {
          update: jest.fn().mockResolvedValue({ id: VALID_RECIPE_ID }),
        },
      }

      return fn(tx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) as ReturnType<typeof prisma.$transaction>
    })

    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({
        publish: false,
        title: '',
        instructions: [],
        ingredientRows: [],
        tags: [],
      }),
    })

    const res = await recipeByIdPatch(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      recipe: expect.objectContaining({ id: VALID_RECIPE_ID, title: '', status: 'draft' }),
    })
  })

  it('PATCH /api/recipes/[id] requires title when publish=true', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeFindFirst.mockResolvedValueOnce({
      id: VALID_RECIPE_ID,
    } as Awaited<ReturnType<typeof prisma.recipe.findFirst>>)

    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({
        publish: true,
        title: '',
        instructions: [],
        ingredientRows: [],
        tags: [],
      }),
    })

    const res = await recipeByIdPatch(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Recipe title is required.' })
  })

  it('DELETE /api/recipes/[id] deletes household recipe', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
    mockedRecipeFindFirst.mockResolvedValueOnce({
      id: VALID_RECIPE_ID,
    } as Awaited<ReturnType<typeof prisma.recipe.findFirst>>)
    mockedRecipeDelete.mockResolvedValueOnce({ id: VALID_RECIPE_ID } as Awaited<ReturnType<typeof prisma.recipe.delete>>)

    const req = new NextRequest(`http://localhost/api/recipes/${VALID_RECIPE_ID}`, { method: 'DELETE' })
    const res = await recipeDelete(req, { params: Promise.resolve({ recipeId: VALID_RECIPE_ID }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})
