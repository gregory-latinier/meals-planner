import {
  buildGeminiApiKeyMetadata,
  decryptHouseholdGeminiApiKey,
  encryptHouseholdGeminiApiKey,
  maskGeminiApiKey,
  resolveGeminiApiKey,
} from '@/lib/household-gemini-api-key'

describe('household gemini api key helpers', () => {
  const previousGeminiApiKey = process.env.GEMINI_API_KEY
  const previousGoogleApiKey = process.env.GOOGLE_API_KEY
  const previousSecret = process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET
  })

  afterAll(() => {
    if (typeof previousGeminiApiKey === 'string') process.env.GEMINI_API_KEY = previousGeminiApiKey
    else delete process.env.GEMINI_API_KEY

    if (typeof previousGoogleApiKey === 'string') process.env.GOOGLE_API_KEY = previousGoogleApiKey
    else delete process.env.GOOGLE_API_KEY

    if (typeof previousSecret === 'string') process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET = previousSecret
    else delete process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET
  })

  it('encrypts/decrypts household key', () => {
    process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET = 'test-secret'
    const encrypted = encryptHouseholdGeminiApiKey('gemini-key-1234')

    expect(encrypted).not.toContain('gemini-key-1234')
    expect(decryptHouseholdGeminiApiKey(encrypted)).toBe('gemini-key-1234')
  })

  it('masks key with fixed prefix and last 4 chars', () => {
    expect(maskGeminiApiKey('abc12345')).toBe('••••••••2345')
    expect(maskGeminiApiKey('123')).toBe('••••••••')
  })

  it('resolves household key before env fallback', () => {
    process.env.HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET = 'test-secret'
    process.env.GEMINI_API_KEY = 'env-key'

    const encrypted = encryptHouseholdGeminiApiKey('household-key')
    expect(resolveGeminiApiKey({ householdEncrypted: encrypted })).toEqual({
      apiKey: 'household-key',
      source: 'household',
    })
  })

  it('falls back to env key when no household key', () => {
    process.env.GOOGLE_API_KEY = 'google-key'

    expect(resolveGeminiApiKey({ householdEncrypted: null })).toEqual({
      apiKey: 'google-key',
      source: 'env',
    })
  })

  it('returns null when no key available', () => {
    expect(resolveGeminiApiKey({ householdEncrypted: null })).toBeNull()
  })

  it('builds metadata from db fields', () => {
    expect(
      buildGeminiApiKeyMetadata({
        encrypted: 'encrypted-value',
        masked: '••••••••1234',
        updatedAt: new Date('2026-10-02T08:00:00.000Z'),
      })
    ).toEqual({
      configured: true,
      masked: '••••••••1234',
      updatedAt: '2026-10-02T08:00:00.000Z',
    })
  })
})
