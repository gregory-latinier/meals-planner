import { FastifyPluginAsync } from 'fastify'
import { query } from '../db/index'
import { requireAuth } from '../lib/auth'
import {
  AVAILABLE_RECIPE_EXTRACTION_MODELS,
  AVAILABLE_RECIPE_IMAGE_PROVIDERS,
  DbRecipeExtractionModel,
  DbRecipeImageProvider,
  mapApiModelToDb,
  mapDbModelToApi,
  mapApiImageProviderToDb,
  mapDbImageProviderToApi,
} from '../lib/ai-settings'
import {
  buildGeminiApiKeyMetadata,
  encryptHouseholdGeminiApiKey,
  maskGeminiApiKey,
} from '../lib/household-gemini-api-key'

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

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ai', async (request, reply) => {
    const { household } = await requireAuth(request, reply)

    const res = await query<{
      recipeExtractionModel: string
      recipeImageProvider: string | null
      geminiApiKeyEncrypted: string | null
      geminiApiKeyMasked: string | null
      geminiApiKeyUpdatedAt: Date | null
    }>(
      `SELECT "recipeExtractionModel", "recipeImageProvider", "geminiApiKeyEncrypted", "geminiApiKeyMasked", "geminiApiKeyUpdatedAt" 
       FROM "Household" WHERE id = $1 LIMIT 1`,
      [household.id]
    )

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Household not found' })
    }

    const row = res.rows[0]
    return reply.send({
      selectedModel: mapDbModelToApi(row.recipeExtractionModel as DbRecipeExtractionModel),
      availableModels: AVAILABLE_RECIPE_EXTRACTION_MODELS,
      selectedImageProvider: mapDbImageProviderToApi(
        (row.recipeImageProvider as DbRecipeImageProvider) || 'NANO_BANANA'
      ),
      availableImageProviders: AVAILABLE_RECIPE_IMAGE_PROVIDERS,
      geminiApiKey: buildGeminiApiKeyMetadata({
        encrypted: row.geminiApiKeyEncrypted,
        masked: row.geminiApiKeyMasked,
        updatedAt: row.geminiApiKeyUpdatedAt,
      }),
    })
  })

  fastify.patch('/ai', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = request.body as {
      selectedModel?: unknown
      selectedImageProvider?: unknown
      geminiApiKey?: unknown
    }

    const currentRes = await query<{
      recipeExtractionModel: string
      recipeImageProvider: string | null
    }>(
      `SELECT "recipeExtractionModel", "recipeImageProvider" FROM "Household" WHERE id = $1 LIMIT 1`,
      [household.id]
    )
    if (currentRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Household not found' })
    }

    let dbModel = currentRes.rows[0].recipeExtractionModel as DbRecipeExtractionModel
    if (body?.selectedModel !== undefined) {
      if (typeof body.selectedModel !== 'string') {
        return reply.status(400).send({ error: 'Invalid payload.' })
      }
      const mapped = mapApiModelToDb(body.selectedModel)
      if (!mapped) {
        return reply.status(400).send({ error: 'Invalid payload.' })
      }
      dbModel = mapped
    }

    let dbImageProvider = (currentRes.rows[0].recipeImageProvider as DbRecipeImageProvider) || 'NANO_BANANA'
    if (body?.selectedImageProvider !== undefined) {
      if (typeof body.selectedImageProvider !== 'string') {
        return reply.status(400).send({ error: 'Invalid payload.' })
      }
      const mapped = mapApiImageProviderToDb(body.selectedImageProvider)
      if (!mapped) {
        return reply.status(400).send({ error: 'Invalid payload.' })
      }
      dbImageProvider = mapped
    }

    const geminiApiKeyPatch = parseGeminiApiKeyPatchValue(body?.geminiApiKey)
    if (geminiApiKeyPatch.action === 'invalid') {
      return reply.status(400).send({ error: 'Invalid payload.' })
    }

    if (geminiApiKeyPatch.action === 'set') {
      const encrypted = encryptHouseholdGeminiApiKey(geminiApiKeyPatch.value)
      const masked = maskGeminiApiKey(geminiApiKeyPatch.value)
      await query(
        `UPDATE "Household"
         SET "recipeExtractionModel" = $1,
             "recipeImageProvider" = $2,
             "geminiApiKeyEncrypted" = $3,
             "geminiApiKeyMasked" = $4,
             "geminiApiKeyUpdatedAt" = NOW(),
             "updatedAt" = NOW()
         WHERE id = $5`,
        [dbModel, dbImageProvider, encrypted, masked, household.id]
      )
    } else if (geminiApiKeyPatch.action === 'remove') {
      await query(
        `UPDATE "Household"
         SET "recipeExtractionModel" = $1,
             "recipeImageProvider" = $2,
             "geminiApiKeyEncrypted" = NULL,
             "geminiApiKeyMasked" = NULL,
             "geminiApiKeyUpdatedAt" = NULL,
             "updatedAt" = NOW()
         WHERE id = $3`,
        [dbModel, dbImageProvider, household.id]
      )
    } else {
      await query(
        `UPDATE "Household"
         SET "recipeExtractionModel" = $1,
             "recipeImageProvider" = $2,
             "updatedAt" = NOW()
         WHERE id = $3`,
        [dbModel, dbImageProvider, household.id]
      )
    }

    const updatedRes = await query<{
      recipeExtractionModel: string
      recipeImageProvider: string | null
      geminiApiKeyEncrypted: string | null
      geminiApiKeyMasked: string | null
      geminiApiKeyUpdatedAt: Date | null
    }>(
      `SELECT "recipeExtractionModel", "recipeImageProvider", "geminiApiKeyEncrypted", "geminiApiKeyMasked", "geminiApiKeyUpdatedAt" 
       FROM "Household" WHERE id = $1 LIMIT 1`,
      [household.id]
    )

    const updatedRow = updatedRes.rows[0]
    return reply.send({
      selectedModel: mapDbModelToApi(updatedRow.recipeExtractionModel as DbRecipeExtractionModel),
      availableModels: AVAILABLE_RECIPE_EXTRACTION_MODELS,
      selectedImageProvider: mapDbImageProviderToApi(
        (updatedRow.recipeImageProvider as DbRecipeImageProvider) || 'NANO_BANANA'
      ),
      availableImageProviders: AVAILABLE_RECIPE_IMAGE_PROVIDERS,
      geminiApiKey: buildGeminiApiKeyMetadata({
        encrypted: updatedRow.geminiApiKeyEncrypted,
        masked: updatedRow.geminiApiKeyMasked,
        updatedAt: updatedRow.geminiApiKeyUpdatedAt,
      }),
    })
  })

  fastify.get('/general', async (request, reply) => {
    const { household } = await requireAuth(request, reply)

    const res = await query<{
      defaultMealPlanServings: number
      weekStartDay: number
    }>(
      `SELECT "defaultMealPlanServings", "weekStartDay"
       FROM "HouseholdPreferences"
       WHERE "householdId" = $1 LIMIT 1`,
      [household.id]
    )

    if (res.rows.length === 0) {
      return reply.send({
        defaultMealPlanServings: 4,
        weekStartDay: 1,
      })
    }

    return reply.send({
      defaultMealPlanServings: res.rows[0].defaultMealPlanServings,
      weekStartDay: res.rows[0].weekStartDay ?? 1,
    })
  })

  fastify.patch('/general', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = request.body as {
      defaultMealPlanServings?: unknown
      weekStartDay?: unknown
    }

    if (body?.defaultMealPlanServings === undefined && body?.weekStartDay === undefined) {
      return reply.status(400).send({ error: 'At least one field to update is required.' })
    }

    let servings: number | undefined
    if (body?.defaultMealPlanServings !== undefined) {
      const rawVal = body.defaultMealPlanServings
      servings = typeof rawVal === 'number' ? rawVal : Number(rawVal)
      if (!Number.isInteger(servings) || servings <= 0 || servings > 100) {
        return reply.status(400).send({ error: 'defaultMealPlanServings must be an integer between 1 and 100.' })
      }
    }

    let weekStartDay: number | undefined
    if (body?.weekStartDay !== undefined) {
      const rawWeekDay = body.weekStartDay
      weekStartDay = typeof rawWeekDay === 'number' ? rawWeekDay : Number(rawWeekDay)
      if (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6) {
        return reply.status(400).send({ error: 'weekStartDay must be an integer between 0 and 6.' })
      }
    }

    const currentRes = await query<{
      defaultMealPlanServings: number
      weekStartDay: number
    }>(
      `SELECT "defaultMealPlanServings", "weekStartDay"
       FROM "HouseholdPreferences"
       WHERE "householdId" = $1 LIMIT 1`,
      [household.id]
    )

    const nextServings = servings ?? currentRes.rows[0]?.defaultMealPlanServings ?? 4
    const nextWeekStartDay = weekStartDay ?? currentRes.rows[0]?.weekStartDay ?? 1

    const upsertRes = await query<{
      defaultMealPlanServings: number
      weekStartDay: number
    }>(
      `INSERT INTO "HouseholdPreferences" ("householdId", "defaultMealPlanServings", "weekStartDay", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT ("householdId")
       DO UPDATE SET
         "defaultMealPlanServings" = EXCLUDED."defaultMealPlanServings",
         "weekStartDay" = EXCLUDED."weekStartDay",
         "updatedAt" = NOW()
       RETURNING "defaultMealPlanServings", "weekStartDay"`,
      [household.id, nextServings, nextWeekStartDay]
    )

    return reply.send({
      defaultMealPlanServings: upsertRes.rows[0].defaultMealPlanServings,
      weekStartDay: upsertRes.rows[0].weekStartDay,
    })
  })
}

