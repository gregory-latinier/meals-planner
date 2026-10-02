import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ENCRYPTION_VERSION = 'v1'
const KEY_SECRET_ENV = 'HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET'
const MASK_PREFIX = '••••••••'

export interface GeminiApiKeyMetadata {
  configured: boolean
  masked: string | null
  updatedAt: string | null
}

export interface ResolvedGeminiApiKey {
  apiKey: string
  source: 'household' | 'env'
}

function getEncryptionSecret(): string {
  const secret = process.env[KEY_SECRET_ENV]?.trim()
  if (!secret) {
    throw new Error(`Missing ${KEY_SECRET_ENV}.`)
  }
  return secret
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32)
}

export function encryptHouseholdGeminiApiKey(apiKey: string): string {
  const secret = getEncryptionSecret()
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = deriveKey(secret, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    ENCRYPTION_VERSION,
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptHouseholdGeminiApiKey(value: string): string {
  const [version, saltBase64, ivBase64, authTagBase64, encryptedBase64] = value.split(':')

  if (!version || !saltBase64 || !ivBase64 || !authTagBase64 || !encryptedBase64 || version !== ENCRYPTION_VERSION) {
    throw new Error('Invalid encrypted Gemini API key format.')
  }

  const secret = getEncryptionSecret()
  const salt = Buffer.from(saltBase64, 'base64')
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')
  const encrypted = Buffer.from(encryptedBase64, 'base64')

  const key = deriveKey(secret, salt)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function maskGeminiApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.length <= 4) return MASK_PREFIX
  return `${MASK_PREFIX}${trimmed.slice(-4)}`
}

export function buildGeminiApiKeyMetadata(input: {
  encrypted: string | null
  masked: string | null
  updatedAt: Date | null
}): GeminiApiKeyMetadata {
  const configured = Boolean(input.encrypted)
  return {
    configured,
    masked: configured ? input.masked : null,
    updatedAt: configured && input.updatedAt ? input.updatedAt.toISOString() : null,
  }
}

function getEnvGeminiApiKey(): string | null {
  const envKey = process.env.GEMINI_API_KEY?.trim() ?? process.env.GOOGLE_API_KEY?.trim()
  return envKey && envKey.length > 0 ? envKey : null
}

export function resolveGeminiApiKey(input: { householdEncrypted: string | null }): ResolvedGeminiApiKey | null {
  if (input.householdEncrypted) {
    const decrypted = decryptHouseholdGeminiApiKey(input.householdEncrypted).trim()
    if (decrypted) {
      return {
        apiKey: decrypted,
        source: 'household',
      }
    }
  }

  const envKey = getEnvGeminiApiKey()
  if (envKey) {
    return {
      apiKey: envKey,
      source: 'env',
    }
  }

  return null
}
