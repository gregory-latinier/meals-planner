import { FastifyPluginAsync } from 'fastify'
import { query, withTransaction } from '../db/index'
import { requireAuth } from '../lib/auth'
import {
  planIngredientRename,
  type IngredientRecord,
  type IngredientRenameOptions,
} from '../lib/ingredient-rename-plan'

const MAX_FIND_LENGTH = 300

interface RenameBody {
  find?: unknown
  replace?: unknown
  wholeName?: unknown
  ingredientIds?: unknown
}

function parseOptions(body: RenameBody): IngredientRenameOptions | null {
  if (typeof body.find !== 'string' || typeof body.replace !== 'string') return null
  const find = body.find.trim()
  if (!find || find.length > MAX_FIND_LENGTH || body.replace.length > MAX_FIND_LENGTH) return null
  return { find, replace: body.replace, wholeName: body.wholeName === true }
}

export const ingredientAdminRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/settings/ingredients/preview { find, replace, wholeName }
  fastify.post('/preview', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const options = parseOptions((request.body as RenameBody) || {})
    if (!options) {
      return reply.status(400).send({ error: 'A search text and a replacement are required' })
    }

    const res = await query<IngredientRecord>(
      `SELECT id, name, "nameNormalized", "createdAt" FROM "Ingredient" WHERE "householdId" = $1`,
      [household.id]
    )

    return reply.send({ entries: planIngredientRename(res.rows, options) })
  })

  // POST /api/settings/ingredients/rename { find, replace, wholeName, ingredientIds }
  fastify.post('/rename', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = (request.body as RenameBody) || {}
    const options = parseOptions(body)
    const ids = Array.isArray(body.ingredientIds)
      ? body.ingredientIds.filter((id): id is string => typeof id === 'string')
      : []

    if (!options || ids.length === 0) {
      return reply.status(400).send({ error: 'A search text, a replacement and ingredients are required' })
    }

    const result = await withTransaction(async (client) => {
      // Lock the household's ingredients and recompute the plan: never trust a client-side plan.
      const all = await client.query<IngredientRecord>(
        `SELECT id, name, "nameNormalized", "createdAt" FROM "Ingredient" WHERE "householdId" = $1 FOR UPDATE`,
        [household.id]
      )
      const plan = planIngredientRename(all.rows, options, new Set(ids))
      const applicable = plan.filter((entry) => entry.error === null)
      const skipped = plan.length - applicable.length

      const merges = applicable.filter((entry) => entry.mergeIntoId)
      const renames = applicable.filter((entry) => !entry.mergeIntoId)

      // Free the normalized names first so that swaps/chains cannot hit the unique constraint.
      if (renames.length > 0) {
        await client.query(
          `UPDATE "Ingredient" SET "nameNormalized" = 'tmp:' || "id" WHERE "id" = ANY($1) AND "householdId" = $2`,
          [renames.map((entry) => entry.id), household.id]
        )
      }

      for (const entry of renames) {
        await client.query(
          `UPDATE "Ingredient" SET "name" = $1, "nameNormalized" = $1, "updatedAt" = NOW()
           WHERE "id" = $2 AND "householdId" = $3`,
          [entry.newName, entry.id, household.id]
        )
        await client.query(
          `UPDATE "ShoppingListItem" i SET "name" = $1, "nameNormalized" = $1, "updatedAt" = NOW()
           FROM "ShoppingList" l
           WHERE l."id" = i."listId" AND l."status" = 'ACTIVE' AND i."ingredientId" = $2`,
          [entry.newName, entry.id]
        )
      }

      // A merge target may itself have been renamed above: resolve its final name from the plan.
      const finalNameById = new Map(renames.map((entry) => [entry.id, entry.newName]))

      for (const entry of merges) {
        const targetId = entry.mergeIntoId!
        const targetName = finalNameById.get(targetId) ?? entry.mergeIntoName ?? entry.newName

        await client.query(`UPDATE "RecipeIngredientRow" SET "ingredientId" = $1 WHERE "ingredientId" = $2`, [
          targetId,
          entry.id,
        ])
        await client.query(
          `UPDATE "ShoppingListItem" i SET "ingredientId" = $1 WHERE i."ingredientId" = $2`,
          [targetId, entry.id]
        )
        await client.query(
          `UPDATE "ShoppingListItem" i SET "name" = $1, "nameNormalized" = $1, "updatedAt" = NOW()
           FROM "ShoppingList" l
           WHERE l."id" = i."listId" AND l."status" = 'ACTIVE' AND i."ingredientId" = $2`,
          [targetName, targetId]
        )
        // Keep the target's translation when both have one for the same locale.
        await client.query(
          `DELETE FROM "IngredientTranslation" t
           WHERE t."ingredientId" = $1
             AND EXISTS (
               SELECT 1 FROM "IngredientTranslation" k
               WHERE k."ingredientId" = $2 AND k."locale" = t."locale"
             )`,
          [entry.id, targetId]
        )
        await client.query(`UPDATE "IngredientTranslation" SET "ingredientId" = $1 WHERE "ingredientId" = $2`, [
          targetId,
          entry.id,
        ])
        await client.query(
          `UPDATE "Ingredient" t
           SET "alwaysInStock" = t."alwaysInStock" OR s."alwaysInStock"
           FROM "Ingredient" s
           WHERE t."id" = $1 AND s."id" = $2`,
          [targetId, entry.id]
        )
        await client.query(`DELETE FROM "Ingredient" WHERE "id" = $1 AND "householdId" = $2`, [
          entry.id,
          household.id,
        ])
      }

      return { renamedCount: renames.length, mergedCount: merges.length, skippedCount: skipped }
    })

    return reply.send(result)
  })
}
