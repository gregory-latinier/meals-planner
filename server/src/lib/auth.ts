import crypto from 'crypto'
import { FastifyRequest, FastifyReply } from 'fastify'
import { query } from '../db/index'
import { Session, Household } from '../types/models'

export const SESSION_COOKIE = 'mp_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400 // 400 days (browser cookie max)
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 // renew at most once a day

export function sessionCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateId(prefix = 'c'): string {
  return prefix + crypto.randomBytes(12).toString('hex')
}

export async function getSessionFromRequest(request: FastifyRequest): Promise<{ session: Session; household: Household } | null> {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) return null

  const res = await query<Session & { householdPasswordHash: string; recipeExtractionModel: any; recipeImageProvider: any; geminiApiKeyEncrypted: string | null; geminiApiKeyMasked: string | null; geminiApiKeyUpdatedAt: Date | null; householdCreatedAt: Date; householdUpdatedAt: Date }>(
    `SELECT s.*, 
            h."passwordHash" as "householdPasswordHash", 
            h."recipeExtractionModel", 
            h."recipeImageProvider", 
            h."geminiApiKeyEncrypted", 
            h."geminiApiKeyMasked", 
            h."geminiApiKeyUpdatedAt", 
            h."createdAt" as "householdCreatedAt", 
            h."updatedAt" as "householdUpdatedAt"
     FROM "Session" s
     JOIN "Household" h ON h.id = s."householdId"
     WHERE s.token = $1 AND s."expiresAt" > NOW()
     LIMIT 1`,
    [token]
  )

  if (res.rows.length === 0) return null
  const row = res.rows[0]

  const session: Session = {
    id: row.id,
    token: row.token,
    householdId: row.householdId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }

  const household: Household = {
    id: row.householdId,
    passwordHash: row.householdPasswordHash,
    recipeExtractionModel: row.recipeExtractionModel,
    recipeImageProvider: row.recipeImageProvider || 'NANO_BANANA',
    geminiApiKeyEncrypted: row.geminiApiKeyEncrypted,
    geminiApiKeyMasked: row.geminiApiKeyMasked,
    geminiApiKeyUpdatedAt: row.geminiApiKeyUpdatedAt,
    createdAt: row.householdCreatedAt,
    updatedAt: row.householdUpdatedAt,
  }

  return { session, household }
}

/** Extracts one cookie value from a raw `Cookie` header (used for Socket.IO handshakes). */
export function readCookieFromHeader(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() !== name) continue
    const raw = part.slice(index + 1).trim()
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return null
}

/** Resolves the household owning a valid, non-expired session token. */
export async function getHouseholdIdForToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  const res = await query<{ householdId: string }>(
    `SELECT "householdId" FROM "Session" WHERE token = $1 AND "expiresAt" > NOW() LIMIT 1`,
    [token]
  )
  return res.rows[0]?.householdId ?? null
}

export function householdRoom(householdId: string): string {
  return `household:${householdId}`
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<{ session: Session; household: Household }> {
  const auth = await getSessionFromRequest(request)
  if (!auth) {
    reply.status(401).send({ error: 'Unauthorized' })
    throw new Error('Unauthorized')
  }
  return auth
}
