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
    }>(
      `SELECT "defaultMealPlanServings"
       FROM "HouseholdPreferences"
       WHERE "householdId" = $1 LIMIT 1`,
      [household.id]
    )

    if (res.rows.length === 0) {
      return reply.send({
        defaultMealPlanServings: 4,
      })
    }

    return reply.send({
      defaultMealPlanServings: res.rows[0].defaultMealPlanServings,
    })
  })

  fastify.patch('/general', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = request.body as {
      defaultMealPlanServings?: unknown
    }

    if (body?.defaultMealPlanServings === undefined) {
      return reply.status(400).send({ error: 'defaultMealPlanServings is required.' })
    }

    const rawVal = body.defaultMealPlanServings
    const servings = typeof rawVal === 'number' ? rawVal : Number(rawVal)

    if (!Number.isInteger(servings) || servings <= 0 || servings > 100) {
      return reply.status(400).send({ error: 'defaultMealPlanServings must be an integer between 1 and 100.' })
    }

    const upsertRes = await query<{
      defaultMealPlanServings: number
    }>(
      `INSERT INTO "HouseholdPreferences" ("householdId", "defaultMealPlanServings", "createdAt", "updatedAt")
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT ("householdId")
       DO UPDATE SET "defaultMealPlanServings" = EXCLUDED."defaultMealPlanServings", "updatedAt" = NOW()
       RETURNING "defaultMealPlanServings"`,
      [household.id, servings]
    )

    return reply.send({
      defaultMealPlanServings: upsertRes.rows[0].defaultMealPlanServings,
    })
  })
}

