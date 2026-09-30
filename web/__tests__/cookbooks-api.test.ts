import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { GET, POST } from '@/app/api/cookbooks/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cookbook: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedFindMany = prisma.cookbook.findMany as jest.MockedFunction<typeof prisma.cookbook.findMany>
const mockedCreate = prisma.cookbook.create as jest.MockedFunction<typeof prisma.cookbook.create>

describe('cookbooks API route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cookbooks', () => {
    it('returns 401 when not authenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost/api/cookbooks')
      const res = await GET(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedFindMany).not.toHaveBeenCalled()
    })

    it('returns cookbooks and recipeCount when authenticated', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindMany.mockResolvedValueOnce([
        {
          id: 'cb-1',
          householdId: 'house-1',
          name: 'Desserts',
          nameNormalized: 'desserts',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ])

      const req = new NextRequest('http://localhost/api/cookbooks?sortBy=name&order=asc')
      const res = await GET(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(mockedFindMany).toHaveBeenCalledWith({
        where: { householdId: 'house-1' },
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      expect(body).toEqual({
        cookbooks: [
          expect.objectContaining({
            id: 'cb-1',
            name: 'Desserts',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            recipeCount: 0,
          }),
        ],
      })
    })

    it('falls back to updatedAt desc when sort params are missing or invalid', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindMany.mockResolvedValueOnce([])

      const req = new NextRequest('http://localhost/api/cookbooks?sortBy=invalid&order=invalid')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(mockedFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        })
      )
    })
  })

  describe('POST /api/cookbooks', () => {
    it('returns 401 when not authenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost/api/cookbooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'Desserts' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedCreate).not.toHaveBeenCalled()
    })

    it('returns 400 when name is missing or empty after trim', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/cookbooks', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Cookbook name is required.' })
      expect(mockedCreate).not.toHaveBeenCalled()
    })

    it('returns 400 when name exceeds 500 characters', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/cookbooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'a'.repeat(501) }),
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: 'Cookbook name must be 500 characters or fewer.',
      })
      expect(mockedCreate).not.toHaveBeenCalled()
    })

    it('creates cookbook with trimmed and normalized name', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedCreate.mockResolvedValueOnce({
        id: 'cb-1',
        householdId: 'house-1',
        name: 'My Cookbook',
        nameNormalized: 'my cookbook',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const req = new NextRequest('http://localhost/api/cookbooks', {
        method: 'POST',
        body: JSON.stringify({ name: '  My Cookbook  ' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          householdId: 'house-1',
          name: 'My Cookbook',
          nameNormalized: 'my cookbook',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      expect(await res.json()).toEqual({
        cookbook: expect.objectContaining({
          id: 'cb-1',
          name: 'My Cookbook',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          recipeCount: 0,
        }),
      })
    })

    it('returns 409 when duplicate cookbook name exists (case-insensitive unique conflict)', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const duplicateError = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.22.0',
      })
      mockedCreate.mockRejectedValueOnce(duplicateError)

      const req = new NextRequest('http://localhost/api/cookbooks', {
        method: 'POST',
        body: JSON.stringify({ name: 'desserts' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ error: 'A cookbook with this name already exists.' })
    })
  })
})
