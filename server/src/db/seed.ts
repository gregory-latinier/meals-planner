import bcrypt from 'bcryptjs'
import { query } from './index'

async function seed() {
  const defaultPassword = process.env.HOUSEHOLD_PASSWORD || process.env.INITIAL_HOUSEHOLD_PASSWORD || 'password123'
  const passwordHash = await bcrypt.hash(defaultPassword, 12)

  const existing = await query('SELECT id FROM "Household" LIMIT 1')
  if (existing.rows.length > 0) {
    console.log('[seed] Household already exists, skipping creation.')
    return
  }

  const id = 'cm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 12)
  await query(
    `INSERT INTO "Household" ("id", "passwordHash", "recipeExtractionModel", "createdAt", "updatedAt")
     VALUES ($1, $2, 'GEMINI_FREE', NOW(), NOW())`,
    [id, passwordHash]
  )

  console.log(`[seed] Created initial household with password: ${defaultPassword}`)
}

seed()
  .catch((err) => {
    console.error('[seed] Error:', err)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
