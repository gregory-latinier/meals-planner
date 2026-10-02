import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/settings/ai/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import * as householdGeminiApiKey from '@/lib/household-gemini-api-key'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}))

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedQueryRaw = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>
const mockedExecuteRaw = prisma.$executeRaw as jest.MockedFunction<typeof prisma.$executeRaw>
const mockedEncryptHouseholdGeminiApiKey = jest.spyOn(householdGeminiApiKey, 'encryptHouseholdGeminiApiKey')
const mockedMaskGeminiApiKey = jest.spyOn(householdGeminiApiKey, 'maskGeminiApiKey')

describe('settings AI API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedEncryptHouseholdGeminiApiKey.mockImplementation((value) => `encrypted:${value}`)
    mockedMaskGeminiApiKey.mockImplementation((value) => `••••••••${value.slice(-4)}`)
  })

  describe('GET /api/settings/ai', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost/api/settings/ai')
      const res = await GET(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedQueryRaw).not.toHaveBeenCalled()
    })

    it('returns selected model, available models, and key metadata', async () => {
      mockedGetSession.mockResolvedValueOnce({
        householdId: 'house-1',
      } as Awaited<ReturnType<typeof getSession>>)
      mockedQueryRaw.mockResolvedValueOnce([
        {
          recipeExtractionModel: 'GEMINI_FREE',
          geminiApiKeyEncrypted: 'encrypted:key',
          geminiApiKeyMasked: '••••••••ABCD',
          geminiApiKeyUpdatedAt: new Date('2026-10-02T07:40:00.000Z'),
        },
      ] as never)

      const req = new NextRequest('http://localhost/api/settings/ai')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        selectedModel: 'gemini-free',
        availableModels: ['gemini-free'],
        geminiApiKey: {
          configured: true,
          masked: '••••••••ABCD',
          updatedAt: '2026-10-02T07:40:00.000Z',
        },
      })
      expect(mockedQueryRaw).toHaveBeenCalledTimes(1)
    })

    it('returns 401 when no household row is returned', async () => {
      mockedGetSession.mockResolvedValueOnce({
        householdId: 'house-1',
      } as Awaited<ReturnType<typeof getSession>>)
      mockedQueryRaw.mockResolvedValueOnce([] as never)

      const req = new NextRequest('http://localhost/api/settings/ai')
      const res = await GET(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedQueryRaw).toHaveBeenCalledTimes(1)
    })
  })

  describe('PATCH /api/settings/ai', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedGetSession.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gemini-free' }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
      expect(mockedExecuteRaw).not.toHaveBeenCalled()
    })

    it('returns 400 for invalid payload shape', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid payload.' })
      expect(mockedExecuteRaw).not.toHaveBeenCalled()
    })

    it('returns 400 for non-allowlisted selectedModel', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gpt-4' }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid payload.' })
      expect(mockedExecuteRaw).not.toHaveBeenCalled()
    })

    it('returns 400 for invalid geminiApiKey payload', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gemini-free', geminiApiKey: '' }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid payload.' })
      expect(mockedExecuteRaw).not.toHaveBeenCalled()
    })

    it('persists model and returns key metadata when key is unchanged', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedExecuteRaw.mockResolvedValueOnce(1 as never)
      mockedQueryRaw.mockResolvedValueOnce([
        {
          recipeExtractionModel: 'GEMINI_FREE',
          geminiApiKeyEncrypted: null,
          geminiApiKeyMasked: null,
          geminiApiKeyUpdatedAt: null,
        },
      ] as never)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gemini-free' }),
      })
      const res = await PATCH(req)

      expect(mockedExecuteRaw).toHaveBeenCalledTimes(1)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        selectedModel: 'gemini-free',
        availableModels: ['gemini-free'],
        geminiApiKey: {
          configured: false,
          masked: null,
          updatedAt: null,
        },
      })
    })

    it('sets/replaces key and returns metadata only (no plaintext)', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedExecuteRaw.mockResolvedValueOnce(1 as never)
      mockedQueryRaw.mockResolvedValueOnce([
        {
          recipeExtractionModel: 'GEMINI_FREE',
          geminiApiKeyEncrypted: 'encrypted:new-key-1234',
          geminiApiKeyMasked: '••••••••1234',
          geminiApiKeyUpdatedAt: new Date('2026-10-02T08:00:00.000Z'),
        },
      ] as never)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gemini-free', geminiApiKey: 'new-key-1234' }),
      })
      const res = await PATCH(req)
      const payload = await res.json()

      expect(mockedEncryptHouseholdGeminiApiKey).toHaveBeenCalledWith('new-key-1234')
      expect(mockedMaskGeminiApiKey).toHaveBeenCalledWith('new-key-1234')
      expect(res.status).toBe(200)
      expect(payload).toEqual({
        selectedModel: 'gemini-free',
        availableModels: ['gemini-free'],
        geminiApiKey: {
          configured: true,
          masked: '••••••••1234',
          updatedAt: '2026-10-02T08:00:00.000Z',
        },
      })
      expect(JSON.stringify(payload)).not.toContain('new-key-1234')
    })

    it('removes key when geminiApiKey is null', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedExecuteRaw.mockResolvedValueOnce(1 as never)
      mockedQueryRaw.mockResolvedValueOnce([
        {
          recipeExtractionModel: 'GEMINI_FREE',
          geminiApiKeyEncrypted: null,
          geminiApiKeyMasked: null,
          geminiApiKeyUpdatedAt: null,
        },
      ] as never)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gemini-free', geminiApiKey: null }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        selectedModel: 'gemini-free',
        availableModels: ['gemini-free'],
        geminiApiKey: {
          configured: false,
          masked: null,
          updatedAt: null,
        },
      })
    })

    it('returns 401 when household row does not exist during update', async () => {
      mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)
      mockedExecuteRaw.mockResolvedValueOnce(0 as never)

      const req = new NextRequest('http://localhost/api/settings/ai', {
        method: 'PATCH',
        body: JSON.stringify({ selectedModel: 'gemini-free' }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized.' })
    })
  })
})
