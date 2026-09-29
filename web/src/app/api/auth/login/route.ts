import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateSecureToken, checkRateLimit, clearRateLimit, getClientIp } from '@/lib/auth'
import { setSessionCookie, getSessionMaxAge } from '@/lib/session'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimit = checkRateLimit(ip)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const { password } = await req.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
    }

    const household = await prisma.household.findFirst()

    if (!household) {
      return NextResponse.json({ error: 'Household not configured.' }, { status: 404 })
    }

    const valid = await bcrypt.compare(password, household.passwordHash)

    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
    }

    // Clear rate limit on success
    clearRateLimit(ip)

    // Create session
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + getSessionMaxAge() * 1000)

    await prisma.session.create({
      data: { token, householdId: household.id, expiresAt },
    })

    const { name, value, options } = setSessionCookie(token)
    const response = NextResponse.json({ success: true })
    response.cookies.set(name, value, options)
    return response
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
