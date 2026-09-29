import { cookies } from 'next/headers'
import { prisma } from './prisma'

const SESSION_COOKIE = 'mp_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { household: true },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  return session
}

export function setSessionCookie(token: string): { name: string; value: string; options: object } {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_MAX_AGE,
      path: '/',
    },
  }
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    },
  }
}

export function getSessionMaxAge() {
  return SESSION_MAX_AGE
}
