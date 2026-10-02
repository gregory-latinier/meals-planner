import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import {
  AVAILABLE_RECIPE_EXTRACTION_MODELS,
  DbRecipeExtractionModel,
  mapApiModelToDb,
  mapDbModelToApi,
} from '@/lib/ai-settings'
import {
  buildGeminiApiKeyMetadata,
  encryptHouseholdGeminiApiKey,
  maskGeminiApiKey,
} from '@/lib/household-gemini-api-key'

interface AiSettingsRequestBody {
  selectedModel?: unknown
  geminiApiKey?: unknown
}

interface HouseholdAiSettingsRow {
  recipeExtractionModel: string
  geminiApiKeyEncrypted: string | null
  geminiApiKeyMasked: string | null
  geminiApiKeyUpdatedAt: Date | null
}

function parseGeminiApiKeyPatchValue(value: unknown):
  | { action: 'unchanged' }
  | { action: 'remove' }
  | { action: 'set'; value: string }
  | { action: 'invalid' } {
  if (value === undefined) return { action: 'unchanged' }
  if (value === null) return { action: 'remove' }
  if (typeof value !== 'string') return { action: 'invalid' }

  const trimmed = value.trim()
  if (!trimmed) return { action: 'invalid' }
  return { action: 'set', value: trimmed }
}

export async function GET(_req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const rows = await prisma.$queryRaw<HouseholdAiSettingsRow[]>`
    SELECT
      "recipeExtractionModel",
      "geminiApiKeyEncrypted",
      "geminiApiKeyMasked",
      "geminiApiKeyUpdatedAt"
    FROM "Household"
    WHERE id = ${session.householdId}
    LIMIT 1
  `

  const household = rows[0]

  if (!household) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  return NextResponse.json({
    selectedModel: mapDbModelToApi(household.recipeExtractionModel as DbRecipeExtractionModel),
    availableModels: AVAILABLE_RECIPE_EXTRACTION_MODELS,
    geminiApiKey: buildGeminiApiKeyMetadata({
      encrypted: household.geminiApiKeyEncrypted,
      masked: household.geminiApiKeyMasked,
      updatedAt: household.geminiApiKeyUpdatedAt,
    }),
  })
}

export async function PATCH(req: NextRequest) {
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

  const selectedModel =
    body && typeof body === 'object' && 'selectedModel' in body
      ? (body as AiSettingsRequestBody).selectedModel
      : undefined

  if (typeof selectedModel !== 'string') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const dbModel = mapApiModelToDb(selectedModel)

  if (!dbModel) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const geminiApiKeyPatch = parseGeminiApiKeyPatchValue(
    body && typeof body === 'object' ? (body as AiSettingsRequestBody).geminiApiKey : undefined
  )

  if (geminiApiKeyPatch.action === 'invalid') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  let updatedRows = 0
  if (geminiApiKeyPatch.action === 'set') {
    const encrypted = encryptHouseholdGeminiApiKey(geminiApiKeyPatch.value)
    const masked = maskGeminiApiKey(geminiApiKeyPatch.value)
    updatedRows = await prisma.$executeRaw`
      UPDATE "Household"
      SET
        "recipeExtractionModel" = ${dbModel}::"RecipeExtractionModel",
        "geminiApiKeyEncrypted" = ${encrypted},
        "geminiApiKeyMasked" = ${masked},
        "geminiApiKeyUpdatedAt" = NOW()
      WHERE id = ${session.householdId}
    `
  } else if (geminiApiKeyPatch.action === 'remove') {
    updatedRows = await prisma.$executeRaw`
      UPDATE "Household"
      SET
        "recipeExtractionModel" = ${dbModel}::"RecipeExtractionModel",
        "geminiApiKeyEncrypted" = NULL,
        "geminiApiKeyMasked" = NULL,
        "geminiApiKeyUpdatedAt" = NULL
      WHERE id = ${session.householdId}
    `
  } else {
    updatedRows = await prisma.$executeRaw`
      UPDATE "Household"
      SET "recipeExtractionModel" = ${dbModel}::"RecipeExtractionModel"
      WHERE id = ${session.householdId}
    `
  }

  if (updatedRows === 0) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const updatedRowsData = await prisma.$queryRaw<HouseholdAiSettingsRow[]>`
    SELECT
      "recipeExtractionModel",
      "geminiApiKeyEncrypted",
      "geminiApiKeyMasked",
      "geminiApiKeyUpdatedAt"
    FROM "Household"
    WHERE id = ${session.householdId}
    LIMIT 1
  `

  const updatedHousehold = updatedRowsData[0]
  if (!updatedHousehold) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  return NextResponse.json({
    selectedModel: mapDbModelToApi(updatedHousehold.recipeExtractionModel as DbRecipeExtractionModel),
    availableModels: AVAILABLE_RECIPE_EXTRACTION_MODELS,
    geminiApiKey: buildGeminiApiKeyMetadata({
      encrypted: updatedHousehold.geminiApiKeyEncrypted,
      masked: updatedHousehold.geminiApiKeyMasked,
      updatedAt: updatedHousehold.geminiApiKeyUpdatedAt,
    }),
  })
}
