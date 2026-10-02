import { lookup } from 'node:dns/promises'
import {
  assertSafeRemoteHttpUrl,
  callGeminiJson,
  MISSING_GEMINI_API_KEY_ERROR,
  pickBestImageWithFallback,
} from '@/lib/recipe-import-web-url'
import { encryptHouseholdGeminiApiKey } from '@/lib/household-gemini-api-key'

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}))

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>

describe('recipe import web url service', () => {
  const previousGeminiApiKey = process.env.GEMINI_API_KEY
  const previousGoogleApiKey = process.env.GOOGLE_API_KEY
  const previousHouseholdEncryptionSecret = process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET
  })

  afterAll(() => {
    if (typeof previousGeminiApiKey === 'string') {
      process.env.GEMINI_API_KEY = previousGeminiApiKey
    } else {
      delete process.env.GEMINI_API_KEY
    }

    if (typeof previousGoogleApiKey === 'string') {
      process.env.GOOGLE_API_KEY = previousGoogleApiKey
    } else {
      delete process.env.GOOGLE_API_KEY
    }

    if (typeof previousHouseholdEncryptionSecret === 'string') {
      process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET = previousHouseholdEncryptionSecret
    } else {
      delete process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET
    }
  })

  it('rejects localhost and private/link-local/loopback host URLs', async () => {
    await expect(assertSafeRemoteHttpUrl('http://localhost:3000/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://127.0.0.1/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://10.0.0.8/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://172.16.0.10/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://192.168.1.20/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://169.254.1.99/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://[::1]/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://[fc00::1]/recipe')).rejects.toThrow('Source URL is not allowed.')
    await expect(assertSafeRemoteHttpUrl('http://[fe80::1]/recipe')).rejects.toThrow('Source URL is not allowed.')
  })

  it('rejects hostname when DNS resolves to blocked ranges', async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: '127.0.0.1', family: 4 },
    ] as unknown as Awaited<ReturnType<typeof lookup>>)

    await expect(assertSafeRemoteHttpUrl('https://example.com/recipe')).rejects.toThrow('Source URL is not allowed.')
    expect(mockedLookup).toHaveBeenCalledTimes(1)
  })

  it('accepts hostname when DNS resolves to public IPs', async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
    ] as unknown as Awaited<ReturnType<typeof lookup>>)

    await expect(assertSafeRemoteHttpUrl('https://example.com/recipe')).resolves.toBe('https://example.com/recipe')
    expect(mockedLookup).toHaveBeenCalledTimes(1)
  })

  it('falls back to next image candidate when first fails', async () => {
    const download = jest.fn()
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce(Buffer.from([1, 2, 3]))

    const store = jest.fn().mockResolvedValueOnce({
      path: '/uploads/recipes/imported.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
      sizeBytes: 12345,
    })

    const result = await pickBestImageWithFallback(
      ['https://img.example.com/1.jpg', 'https://img.example.com/2.jpg'],
      { download, store }
    )

    expect(download).toHaveBeenCalledTimes(2)
    expect(download).toHaveBeenNthCalledWith(1, 'https://img.example.com/1.jpg')
    expect(download).toHaveBeenNthCalledWith(2, 'https://img.example.com/2.jpg')
    expect(store).toHaveBeenCalledTimes(1)
    expect(result.warning).toBeNull()
    expect(result.image).toEqual({
      path: '/uploads/recipes/imported.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
      sizeBytes: 12345,
    })
  })

  it('returns non-fatal warning when all image candidates fail', async () => {
    const download = jest.fn().mockRejectedValue(new Error('nope'))
    const store = jest.fn()

    const result = await pickBestImageWithFallback(
      ['https://img.example.com/1.jpg', 'https://img.example.com/2.jpg'],
      { download, store }
    )

    expect(download).toHaveBeenCalledTimes(2)
    expect(store).not.toHaveBeenCalled()
    expect(result.image).toBeNull()
    expect(result.warning).toBe('Recipe imported, but image could not be imported.')
  })

  it('calls Gemini generateContent endpoint with API key header and parses JSON response', async () => {
    process.env.GEMINI_API_KEY = 'gem-key-123'
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"title":"Pasta"}' }],
            },
          },
        ],
      }),
    } as Response)

    const parsed = await callGeminiJson<{ title: string }>('gemini-2.5-flash', 'Extract JSON.', fetchMock, null)

    expect(parsed).toEqual({ title: 'Pasta' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-goog-api-key': 'gem-key-123',
        }),
      })
    )
  })

  it('surfaces deterministic missing API key error', async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>

    await expect(callGeminiJson<unknown>('gemini-2.5-flash', 'Extract JSON.', fetchMock, null)).rejects.toThrow(
      MISSING_GEMINI_API_KEY_ERROR
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('extracts JSON from a later Gemini candidate when first candidate is non-JSON', async () => {
    process.env.GOOGLE_API_KEY = 'google-key-123'
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'I think this recipe looks great!' }],
            },
          },
          {
            content: {
              parts: [{ text: '```json\n{"title":"Soup"}\n```' }],
            },
          },
        ],
      }),
    } as Response)

    const parsed = await callGeminiJson<{ title: string }>('gemini-2.5-flash', 'Extract JSON.', fetchMock, null)
    expect(parsed).toEqual({ title: 'Soup' })
  })

  it('uses household encrypted key before env fallback', async () => {
    process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET = 'secret-123'
    process.env.GEMINI_API_KEY = 'env-key-111'

    const encrypted = encryptHouseholdGeminiApiKey('household-key-2222')

    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"title":"Stew"}' }],
            },
          },
        ],
      }),
    } as Response)

    const parsed = await callGeminiJson<{ title: string }>(
      'gemini-2.5-flash',
      'Extract JSON.',
      fetchMock,
      encrypted
    )

    expect(parsed).toEqual({ title: 'Stew' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-goog-api-key': 'household-key-2222',
        }),
      })
    )
  })
})
