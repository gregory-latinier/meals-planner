import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { importRecipeFromText, validateImportText } from '@/lib/recipe-import-text'
import { MISSING_GEMINI_API_KEY_ERROR } from '@/lib/recipe-import-web-url'

interface HouseholdImportSettingsRow {
  recipeExtractionModel: 'GEMINI_FREE'
  geminiApiKeyEncrypted: string | null
}

function parseImportText(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const candidate = (body as { importText?: unknown }).importText
  return validateImportText(candidate)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const importText = parseImportText(body)
  if (!importText) {
    return NextResponse.json({ error: 'Invalid import text.' }, { status: 400 })
  }

  try {
    const households = await prisma.$queryRaw<HouseholdImportSettingsRow[]>`
      SELECT "recipeExtractionModel", "geminiApiKeyEncrypted"
      FROM "Household"
      WHERE id = ${session.householdId}
      LIMIT 1
    `

    const household = households[0]

    if (!household) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const result = await importRecipeFromText({
      householdId: session.householdId,
      importText,
      model: household.recipeExtractionModel,
      householdGeminiApiKeyEncrypted: household.geminiApiKeyEncrypted,
    })

    return NextResponse.json({
      recipe: {
        id: result.recipeId,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      const expected = new Set([
        'Invalid import text.',
        'AI extraction failed.',
        MISSING_GEMINI_API_KEY_ERROR,
      ])
      if (expected.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('[recipes.import.text.post]', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
