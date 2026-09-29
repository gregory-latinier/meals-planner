import { NextRequest, NextResponse } from 'next/server'
import { getSession, clearSessionCookie } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (session) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
  }

  const { name, value, options } = clearSessionCookie()
  const response = NextResponse.json({ success: true })
  response.cookies.set(name, value, options)
  return response
}
