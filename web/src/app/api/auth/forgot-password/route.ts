import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/auth'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  try {
    // In a real household app there's only one account, so no email needed.
    // We generate a reset token and return it (in production: send via configured channel).
    const household = await prisma.household.findFirst()

    if (!household) {
      return NextResponse.json({ error: 'Household not configured.' }, { status: 404 })
    }

    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { token, householdId: household.id, expiresAt },
    })

    // In dev: return the token directly for convenience
    // In production: this should be delivered via a configured secure channel
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ token, message: 'Use this token to reset your password.' })
    }

    return NextResponse.json({
      message: 'If a household is configured, a reset token has been generated. Check your server logs.',
    })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
