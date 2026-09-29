import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction([
      prisma.household.update({
        where: { id: resetToken.householdId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      // Invalidate all sessions on password reset
      prisma.session.deleteMany({ where: { householdId: resetToken.householdId } }),
    ])

    return NextResponse.json({ success: true, message: 'Password updated successfully.' })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
