import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { importRecipeFromWebUrl, MISSING_GEMINI_API_KEY_ERROR } from '@/lib/recipe-import-web-url'
import { getSession } from '@/lib/session'

interface HouseholdImportSettingsRow {
  recipeExtractionModel: 'GEMINI_FREE'
  geminiApiKeyEncrypted: string | null
}

function parseSourceUrl(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const candidate = (body as { sourceUrl?: unknown }).sourceUrl
  if (typeof candidate !== 'string') return null
  const trimmed = candidate.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
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

  const sourceUrl = parseSourceUrl(body)
  if (!sourceUrl) {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
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

    const result = await importRecipeFromWebUrl({
      householdId: session.householdId,
      sourceUrl,
      model: household.recipeExtractionModel,
      householdGeminiApiKeyEncrypted: household.geminiApiKeyEncrypted,
    })

    return NextResponse.json({
      recipe: {
        id: result.recipeId,
      },
      warnings: result.imageImportWarning ? [result.imageImportWarning] : [],
    })
  } catch (error) {
    if (error instanceof Error) {
      const expected = new Set([
        'Source URL is not allowed.',
        'Could not fetch source page.',
        'Source URL did not return an HTML page.',
        'Source page is too large.',
        'AI extraction failed.',
        MISSING_GEMINI_API_KEY_ERROR,
      ])
      if (expected.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('[recipes.import.web-url.post]', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
