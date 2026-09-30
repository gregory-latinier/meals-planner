import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { GET, POST } from '@/app/api/stores/route'
import { PATCH, DELETE } from '@/app/api/stores/[storeId]/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedFindMany = prisma.store.findMany as jest.MockedFunction<typeof prisma.store.findMany>
const mockedCreate = prisma.store.create as jest.MockedFunction<typeof prisma.store.create>
const mockedFindFirst = prisma.store.findFirst as jest.MockedFunction<typeof prisma.store.findFirst>
const mockedUpdate = prisma.store.update as jest.MockedFunction<typeof prisma.store.update>
const mockedDelete = prisma.store.delete as jest.MockedFunction<typeof prisma.store.delete>
const VALID_STORE_ID = 'c123456789012345678901234'

describe('stores API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/stores', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost/api/stores')
      const res = await GET(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedFindMany).not.toHaveBeenCalled()
    })

    it('returns stores for current household sorted by query', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindMany.mockResolvedValueOnce([
        {
          id: 'st-1',
          householdId: 'house-1',
          name: 'Main Store',
          nameNormalized: 'main store',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ])

      const req = new NextRequest('http://localhost/api/stores?sortBy=name&order=asc')
      const res = await GET(req)

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
      expect(await res.json()).toEqual({
        stores: [
          expect.objectContaining({
            id: 'st-1',
            name: 'Main Store',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          }),
        ],
      })
    })
  })

  describe('POST /api/stores', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ name: 'Corner Shop' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedCreate).not.toHaveBeenCalled()
    })

    it('returns 400 when name is empty', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Store name is required.' })
      expect(mockedCreate).not.toHaveBeenCalled()
    })

    it('creates store with trimmed and normalized name', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedCreate.mockResolvedValueOnce({
        id: 'st-1',
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ name: '  Corner Shop  ' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          householdId: 'house-1',
          name: 'Corner Shop',
          nameNormalized: 'corner shop',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      expect(await res.json()).toEqual({
        store: expect.objectContaining({
          id: 'st-1',
          name: 'Corner Shop',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      })
    })

    it('returns 409 on duplicate name conflict', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      const duplicateError = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.22.0',
      })
      mockedCreate.mockRejectedValueOnce(duplicateError)

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ name: 'corner shop' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ error: 'A store with this name already exists.' })
    })
  })

  describe('PATCH /api/stores/[storeId]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renamed' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedFindFirst).not.toHaveBeenCalled()
      expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('returns 400 when storeId is invalid', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/stores/not-a-cuid', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renamed' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: 'not-a-cuid' }) })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid storeId.' })
      expect(mockedFindFirst).not.toHaveBeenCalled()
      expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('returns 400 when trimmed name is empty', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Store name is required.' })
      expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('returns 400 when name exceeds max length', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'a'.repeat(501) }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Store name must be 500 characters or fewer.' })
      expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('returns 404 when store is not in current household', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renamed' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'Store not found.' })
      expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('allows unchanged effective name for same record', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Corner Shop  ' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        store: expect.objectContaining({
          id: VALID_STORE_ID,
          name: 'Corner Shop',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      })
      expect(mockedUpdate).not.toHaveBeenCalled()
    })

    it('updates store name and normalization', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      mockedUpdate.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Weekend Market',
        nameNormalized: 'weekend market',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      })

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Weekend Market  ' }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(200)
      expect(mockedUpdate).toHaveBeenCalledWith({
        where: { id: VALID_STORE_ID },
        data: {
          name: 'Weekend Market',
          nameNormalized: 'weekend market',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })
  })

  describe('DELETE /api/stores/[storeId]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedFindFirst).not.toHaveBeenCalled()
      expect(mockedDelete).not.toHaveBeenCalled()
    })

    it('returns 400 when storeId is invalid', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/stores/not-a-cuid', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ storeId: 'not-a-cuid' }) })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid storeId.' })
      expect(mockedFindFirst).not.toHaveBeenCalled()
      expect(mockedDelete).not.toHaveBeenCalled()
    })

    it('returns 404 when store is not found', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'Store not found.' })
      expect(mockedDelete).not.toHaveBeenCalled()
    })

    it('deletes a store in current household', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedFindFirst.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      mockedDelete.mockResolvedValueOnce({
        id: VALID_STORE_ID,
        householdId: 'house-1',
        name: 'Corner Shop',
        nameNormalized: 'corner shop',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const req = new NextRequest(`http://localhost/api/stores/${VALID_STORE_ID}`, { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ storeId: VALID_STORE_ID }) })

      expect(res.status).toBe(200)
      expect(mockedDelete).toHaveBeenCalledWith({ where: { id: VALID_STORE_ID } })
      expect(await res.json()).toEqual({ success: true })
    })
  })
})
