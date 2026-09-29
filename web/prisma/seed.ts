import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = process.env.HOUSEHOLD_PASSWORD

  if (!password) {
    throw new Error('HOUSEHOLD_PASSWORD environment variable is required for seeding.')
  }

  const existing = await prisma.household.findFirst()

  if (existing) {
    console.log('Household already exists — skipping seed.')
    console.log('To reset the password, use the /api/auth/forgot-password endpoint.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const household = await prisma.household.create({
    data: { passwordHash },
  })

  console.log(`✅ Household created: ${household.id}`)
  console.log('You can now log in with your configured HOUSEHOLD_PASSWORD.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
