import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { query, withTransaction } from '../db/index'
import {
  generateId,
  generateSecureToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  sessionCookieOptions,
  getSessionFromRequest,
  requireAuth,
} from '../lib/auth'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login
  fastify.post('/login', async (request, reply) => {
    const { password } = (request.body as { password?: string }) || {}
    if (!password) {
      return reply.status(400).send({ error: 'Password is required' })
    }

    const householdRes = await query('SELECT * FROM "Household" LIMIT 1')
    if (householdRes.rows.length === 0) {
      return reply.status(404).send({ error: 'No household configured' })
    }

    const household = householdRes.rows[0]
    const valid = await bcrypt.compare(password, household.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid password' })
    }

    const token = generateSecureToken()
    const sessionId = generateId('cs')
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

    await query(
      `INSERT INTO "Session" ("id", "token", "householdId", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, token, household.id, expiresAt]
    )

    reply.setCookie(SESSION_COOKIE, token, {
      ...sessionCookieOptions(),
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    return reply.send({ success: true, householdId: household.id })
  })

  // Me
  fastify.get('/me', async (request, reply) => {
    const auth = await getSessionFromRequest(request)
    if (!auth) {
      return reply.status(401).send({ authenticated: false })
    }

    // Sliding renewal: keep the session alive as long as the app is used
    const renewBefore = Date.now() + (SESSION_MAX_AGE_SECONDS - SESSION_REFRESH_THRESHOLD_SECONDS) * 1000
    if (new Date(auth.session.expiresAt).getTime() < renewBefore) {
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
      await query('UPDATE "Session" SET "expiresAt" = $1 WHERE id = $2', [expiresAt, auth.session.id])
      reply.setCookie(SESSION_COOKIE, auth.session.token, {
        ...sessionCookieOptions(),
        maxAge: SESSION_MAX_AGE_SECONDS,
      })
    }

    return reply.send({
      authenticated: true,
      householdId: auth.household.id,
      recipeExtractionModel: auth.household.recipeExtractionModel,
    })
  })

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) {
      await query('DELETE FROM "Session" WHERE token = $1', [token]).catch(() => {})
    }

    reply.clearCookie(SESSION_COOKIE, sessionCookieOptions())

    return reply.send({ success: true })
  })

  // Forgot password
  fastify.post('/forgot-password', async (request, reply) => {
    const householdRes = await query('SELECT id FROM "Household" LIMIT 1')
    if (householdRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Household not found' })
    }

    const householdId = householdRes.rows[0].id
    const token = generateSecureToken()
    const tokenId = generateId('cp')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await query(
      `INSERT INTO "PasswordResetToken" ("id", "token", "householdId", "expiresAt", "used", "createdAt")
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [tokenId, token, householdId, expiresAt]
    )

    return reply.send({ success: true, token })
  })

  // Reset password
  fastify.post('/reset-password', async (request, reply) => {
    const { token, newPassword } = (request.body as { token?: string; newPassword?: string }) || {}
    if (!token || !newPassword || newPassword.length < 6) {
      return reply.status(400).send({ error: 'Token and new password (min 6 chars) required' })
    }

    const tokenRes = await query(
      `SELECT * FROM "PasswordResetToken" WHERE token = $1 AND "expiresAt" > NOW() AND used = false`,
      [token]
    )
    if (tokenRes.rows.length === 0) {
      return reply.status(400).send({ error: 'Invalid or expired reset token' })
    }

    const resetToken = tokenRes.rows[0]
    const passwordHash = await bcrypt.hash(newPassword, 12)

    await withTransaction(async (client) => {
      await client.query(`UPDATE "Household" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2`, [
        passwordHash,
        resetToken.householdId,
      ])
      await client.query(`UPDATE "PasswordResetToken" SET used = true WHERE id = $1`, [resetToken.id])
      await client.query(`DELETE FROM "Session" WHERE "householdId" = $1`, [resetToken.householdId])
    })

    return reply.send({ success: true })
  })
}
