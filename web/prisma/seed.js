const bcrypt = require('bcryptjs')
const { Client } = require('pg')
const crypto = require('crypto')

function createCuid() {
  const timestamp = (new Date().getTime()).toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `c${timestamp}${random}`.slice(0, 25)
}

async function main() {
  const password = process.env.HOUSEHOLD_PASSWORD
  const connectionString = process.env.DATABASE_URL

  if (!password) {
    throw new Error('HOUSEHOLD_PASSWORD environment variable is required for seeding.')
  }

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for seeding.')
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const checkRes = await client.query('SELECT id FROM "Household" LIMIT 1')
    if (checkRes.rows && checkRes.rows.length > 0) {
      console.log('Household already exists — skipping seed.')
      console.log('To reset the password, use the /api/auth/forgot-password endpoint.')
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const householdId = createCuid()
    const now = new Date()

    await client.query(
      'INSERT INTO "Household" ("id", "passwordHash", "recipeExtractionModel", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)',
      [householdId, passwordHash, 'GEMINI_FREE', now, now]
    )

    console.log(`✅ Household created: ${householdId}`)
    console.log('You can now log in with your configured HOUSEHOLD_PASSWORD.')
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
