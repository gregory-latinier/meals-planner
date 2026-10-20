import { FastifyPluginAsync } from 'fastify'
import path from 'path'
import fs from 'fs'
import { query, withTransaction } from '../db/index'
import { generateId, requireAuth } from '../lib/auth'
import { importRecipeFromWebUrl, MISSING_GEMINI_API_KEY_ERROR } from '../lib/recipe-import-web-url'
import { importRecipeFromText, validateImportText } from '../lib/recipe-import-text'
import { normalizeHeading, normalizeInstructionHeadings } from '../lib/recipe-domain'

export const recipeRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper to fetch full recipe with tags and ingredient rows
  async function getFullRecipe(recipeId: string, householdId: string) {
    const rRes = await query(
      `SELECT r.*, c.name as "cookbookName"
       FROM "Recipe" r
       LEFT JOIN "Cookbook" c ON c.id = r."cookbookId"
       WHERE r.id = $1 AND r."householdId" = $2`,
      [recipeId, householdId]
    )
    if (rRes.rows.length === 0) return null
    const recipe = rRes.rows[0]

    recipe.status = recipe.status ? String(recipe.status).toLowerCase() : 'draft'
    recipe.cookbook = recipe.cookbookId ? { id: recipe.cookbookId, name: recipe.cookbookName } : null

    const tagsRes = await query(
      `SELECT t.* 
       FROM "RecipeTag" t
       JOIN "RecipeTagOnRecipe" rtr ON rtr."tagId" = t.id
       WHERE rtr."recipeId" = $1
       ORDER BY t."nameNormalized" ASC`,
      [recipeId]
    )
    recipe.tags = tagsRes.rows

    const rowsRes = await query(
      `SELECT rir.*, i.name as "ingredientName", u.name as "unitName"
       FROM "RecipeIngredientRow" rir
       LEFT JOIN "Ingredient" i ON i.id = rir."ingredientId"
       LEFT JOIN "Unit" u ON u.id = rir."unitId"
       WHERE rir."recipeId" = $1
       ORDER BY rir.position ASC`,
      [recipeId]
    )
    recipe.ingredientRows = rowsRes.rows.map((row: any) => ({
      ...row,
      kind: row.kind ? String(row.kind).toLowerCase() : 'item',
      ingredient: row.ingredientId ? { id: row.ingredientId, name: row.ingredientName } : null,
      unit: row.unitId ? { id: row.unitId, name: row.unitName } : null,
    }))
    return recipe
  }

  // List recipes
  fastify.get('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { cookbookId, tagId, search, sortBy, order } =
      (request.query as {
        cookbookId?: string
        tagId?: string
        search?: string
        sortBy?: string
        order?: string
      }) || {}

    const sortColumn = sortBy === 'title' ? 'LOWER(r.title)' : 'r."updatedAt"'
    const sortDirection = order === 'asc' ? 'ASC' : 'DESC'

    let sql = `
      SELECT r.id, r.title, r.status, r.servings, r."prepMinutes", r."cookMinutes", 
             r."imagePath", r."publishedAt", r."createdAt", r."updatedAt",
             c.name as "cookbookName",
             COALESCE(
               json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), 
               '[]'
             ) as tags
      FROM "Recipe" r
      LEFT JOIN "Cookbook" c ON c.id = r."cookbookId"
      LEFT JOIN "RecipeTagOnRecipe" rtr ON rtr."recipeId" = r.id
      LEFT JOIN "RecipeTag" t ON t.id = rtr."tagId"
      WHERE r."householdId" = $1
    `
    const params: any[] = [household.id]

    if (cookbookId) {
      params.push(cookbookId)
      sql += ` AND r."cookbookId" = $${params.length}`
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      const p = params.length
      sql += ` AND (
        LOWER(r.title) LIKE $${p}
        OR EXISTS (
          SELECT 1
          FROM "RecipeIngredientRow" rir
          LEFT JOIN "Ingredient" i ON i.id = rir."ingredientId"
          LEFT JOIN "IngredientTranslation" it ON it."ingredientId" = i.id
          WHERE rir."recipeId" = r.id
            AND (
              LOWER(i.name) LIKE $${p}
              OR LOWER(it.name) LIKE $${p}
            )
        )
      )`
    }

    sql += ` GROUP BY r.id, c.name ORDER BY ${sortColumn} ${sortDirection}`

    const res = await query(sql, params)
    let recipes = res.rows.map((r: any) => ({
      ...r,
      status: r.status ? String(r.status).toLowerCase() : 'draft',
      cookbook: r.cookbookId ? { id: r.cookbookId, name: r.cookbookName } : null,
    }))

    if (tagId) {
      recipes = recipes.filter((r: any) => r.tags.some((t: any) => t.id === tagId))
    }

    return reply.send({ recipes })
  })

  // Create draft recipe
  fastify.post('/draft', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const id = generateId('rc')

    const res = await query(
      `INSERT INTO "Recipe" (
        "id", "householdId", "title", "status", "instructions", "autosaveVersion", "createdAt", "updatedAt"
       ) VALUES ($1, $2, '', 'DRAFT', '[]'::jsonb, 0, NOW(), NOW())
       RETURNING *`,
      [id, household.id]
    )

    return reply.status(201).send({ recipe: res.rows[0] })
  })

  // Get recipe by ID
  fastify.get('/:recipeId', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { recipeId } = request.params as { recipeId: string }

    const recipe = await getFullRecipe(recipeId, household.id)
    if (!recipe) {
      return reply.status(404).send({ error: 'Recipe not found' })
    }

    return reply.send({ recipe })
  })

  // Save / Publish recipe
  fastify.route({
    method: ['PUT', 'PATCH'],
    url: '/:recipeId',
    handler: async (request, reply) => {
      const { household } = await requireAuth(request, reply)
      const { recipeId } = request.params as { recipeId: string }
      const body = (request.body as any) || {}

      const {
        title,
        cookbookId,
        servings,
        prepMinutes,
        cookMinutes,
        sourceUrl,
        instructions,
        ingredientRows,
        tagIds,
        tags,
        status,
        imagePath,
        imageMimeType,
        imageWidth,
        imageHeight,
        imageSizeBytes,
      } = body

      if (!title || !title.trim()) {
        return reply.status(400).send({ error: 'Title is required' })
      }

      await withTransaction(async (client) => {
        const isPublished = Boolean(body.publish === true || status === 'PUBLISHED' || status === 'published')
        const updRes = await client.query(
          `UPDATE "Recipe"
           SET "title" = $1,
               "cookbookId" = $2,
               "servings" = $3,
               "prepMinutes" = $4,
               "cookMinutes" = $5,
               "sourceUrl" = $6,
               "instructions" = $7::jsonb,
               "status" = $8::"RecipeStatus",
               "imagePath" = COALESCE($9, "imagePath"),
               "imageMimeType" = COALESCE($10, "imageMimeType"),
               "imageWidth" = COALESCE($11, "imageWidth"),
               "imageHeight" = COALESCE($12, "imageHeight"),
               "imageSizeBytes" = COALESCE($13, "imageSizeBytes"),
               "publishedAt" = CASE WHEN $8::text = 'PUBLISHED' AND "publishedAt" IS NULL THEN NOW() ELSE "publishedAt" END,
               "updatedAt" = NOW()
           WHERE id = $14 AND "householdId" = $15
           RETURNING *`,
          [
            title.trim(),
            cookbookId || null,
            servings ? parseInt(servings, 10) : null,
            prepMinutes ? parseInt(prepMinutes, 10) : null,
            cookMinutes ? parseInt(cookMinutes, 10) : null,
            sourceUrl?.trim() || null,
            JSON.stringify(normalizeInstructionHeadings(instructions || [])),
            isPublished ? 'PUBLISHED' : 'DRAFT',
            imagePath !== undefined ? imagePath : null,
            imageMimeType !== undefined ? imageMimeType : null,
            imageWidth !== undefined ? imageWidth : null,
            imageHeight !== undefined ? imageHeight : null,
            imageSizeBytes !== undefined ? imageSizeBytes : null,
            recipeId,
            household.id,
          ]
        )

        if (updRes.rows.length === 0) {
          throw new Error('NOT_FOUND')
        }

        // Update tags
        let resolvedTagIds: string[] = []
        if (Array.isArray(tagIds)) {
          resolvedTagIds = tagIds
        } else if (Array.isArray(tags)) {
          for (const tagName of tags) {
            const trimmed = String(tagName).trim()
            if (!trimmed) continue
            const tagRes = await client.query(
              `INSERT INTO "RecipeTag" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "name" = EXCLUDED."name"
               RETURNING "id"`,
              [generateId('tag'), household.id, trimmed, trimmed.toLowerCase()]
            )
            resolvedTagIds.push(tagRes.rows[0].id)
          }
        }

        if (Array.isArray(tagIds) || Array.isArray(tags)) {
          await client.query(`DELETE FROM "RecipeTagOnRecipe" WHERE "recipeId" = $1`, [recipeId])
          for (const tagId of resolvedTagIds) {
            await client.query(
              `INSERT INTO "RecipeTagOnRecipe" ("recipeId", "tagId", "createdAt") VALUES ($1, $2, NOW())`,
              [recipeId, tagId]
            )
          }
        }

        // Update ingredient rows
        if (Array.isArray(ingredientRows)) {
          await client.query(`DELETE FROM "RecipeIngredientRow" WHERE "recipeId" = $1`, [recipeId])
          let position = 0
          for (const row of ingredientRows) {
            const rowId = generateId('row')
            await client.query(
              `INSERT INTO "RecipeIngredientRow" (
                "id", "recipeId", "position", "kind", "heading", "ingredientId", "quantity", "unitId", "note", "createdAt", "updatedAt"
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [
                rowId,
                recipeId,
                position++,
                row.kind ? String(row.kind).toUpperCase() : 'ITEM',
                row.heading ? normalizeHeading(String(row.heading)) || null : null,
                row.ingredientId || null,
                row.quantity || null,
                row.unitId || null,
                row.note || null,
              ]
            )
          }
        }

        return updRes.rows[0]
      })

      const full = await getFullRecipe(recipeId, household.id)
      return reply.send({ recipe: full })
    },
  })

  // Autosave recipe
  fastify.route({
    method: ['POST', 'PATCH'],
    url: '/:recipeId/autosave',
    handler: async (request, reply) => {
      const { household } = await requireAuth(request, reply)
      const { recipeId } = request.params as { recipeId: string }
      const body = (request.body as any) || {}

      const {
        title,
        cookbookId,
        servings,
        prepMinutes,
        cookMinutes,
        sourceUrl,
        instructions,
        ingredientRows,
        tagIds,
        tags,
        imagePath,
        imageMimeType,
        imageWidth,
        imageHeight,
        imageSizeBytes,
        clientVersion,
      } = body

      const existingRes = await query(
        `SELECT "autosaveVersion" FROM "Recipe" WHERE id = $1 AND "householdId" = $2`,
        [recipeId, household.id]
      )

      if (existingRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Recipe not found' })
      }

      const currentVersion = existingRes.rows[0].autosaveVersion
      if (clientVersion !== undefined && clientVersion < currentVersion) {
        return reply.status(409).send({ error: 'Conflict: older version', currentVersion })
      }

      const newVersion = currentVersion + 1

      await withTransaction(async (client) => {
        await client.query(
          `UPDATE "Recipe"
           SET "title" = COALESCE($1, "title"),
               "cookbookId" = $2,
               "servings" = $3,
               "prepMinutes" = $4,
               "cookMinutes" = $5,
               "sourceUrl" = $6,
               "instructions" = COALESCE($7::jsonb, "instructions"),
               "imagePath" = COALESCE($8, "imagePath"),
               "imageMimeType" = COALESCE($9, "imageMimeType"),
               "imageWidth" = COALESCE($10, "imageWidth"),
               "imageHeight" = COALESCE($11, "imageHeight"),
               "imageSizeBytes" = COALESCE($12, "imageSizeBytes"),
               "lastAutosavedAt" = NOW(),
               "autosaveVersion" = $13,
               "updatedAt" = NOW()
           WHERE id = $14 AND "householdId" = $15`,
          [
            title?.trim() || null,
            cookbookId || null,
            servings ? parseInt(servings, 10) : null,
            prepMinutes ? parseInt(prepMinutes, 10) : null,
            cookMinutes ? parseInt(cookMinutes, 10) : null,
            sourceUrl?.trim() || null,
            instructions ? JSON.stringify(normalizeInstructionHeadings(instructions)) : null,
            imagePath !== undefined ? imagePath : null,
            imageMimeType !== undefined ? imageMimeType : null,
            imageWidth !== undefined ? imageWidth : null,
            imageHeight !== undefined ? imageHeight : null,
            imageSizeBytes !== undefined ? imageSizeBytes : null,
            newVersion,
            recipeId,
            household.id,
          ]
        )

        let resolvedTagIds: string[] = []
        if (Array.isArray(tagIds)) {
          resolvedTagIds = tagIds
        } else if (Array.isArray(tags)) {
          for (const tagName of tags) {
            const trimmed = String(tagName).trim()
            if (!trimmed) continue
            const tagRes = await client.query(
              `INSERT INTO "RecipeTag" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "name" = EXCLUDED."name"
               RETURNING "id"`,
              [generateId('tag'), household.id, trimmed, trimmed.toLowerCase()]
            )
            resolvedTagIds.push(tagRes.rows[0].id)
          }
        }

        if (Array.isArray(tagIds) || Array.isArray(tags)) {
          await client.query(`DELETE FROM "RecipeTagOnRecipe" WHERE "recipeId" = $1`, [recipeId])
          for (const tagId of resolvedTagIds) {
            await client.query(
              `INSERT INTO "RecipeTagOnRecipe" ("recipeId", "tagId", "createdAt") VALUES ($1, $2, NOW())`,
              [recipeId, tagId]
            )
          }
        }

        if (Array.isArray(ingredientRows)) {
          await client.query(`DELETE FROM "RecipeIngredientRow" WHERE "recipeId" = $1`, [recipeId])
          let position = 0
          for (const row of ingredientRows) {
            const rowId = generateId('row')
            await client.query(
              `INSERT INTO "RecipeIngredientRow" (
                "id", "recipeId", "position", "kind", "heading", "ingredientId", "quantity", "unitId", "note", "createdAt", "updatedAt"
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [
                rowId,
                recipeId,
                position++,
                row.kind ? String(row.kind).toUpperCase() : 'ITEM',
                row.heading ? normalizeHeading(String(row.heading)) || null : null,
                row.ingredientId || null,
                row.quantity || null,
                row.unitId || null,
                row.note || null,
              ]
            )
          }
        }
      })

      return reply.send({ success: true, autosaveVersion: newVersion, savedAt: new Date() })
    },
  })

  // Import recipe from web URL
  fastify.post('/import/web-url', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = request.body as { sourceUrl?: string }

    if (!body || typeof body.sourceUrl !== 'string' || !body.sourceUrl.trim()) {
      return reply.status(400).send({ error: 'Invalid URL.' })
    }

    try {
      const hRes = await query<{
        recipeExtractionModel: 'GEMINI_FREE'
        geminiApiKeyEncrypted: string | null
      }>(
        `SELECT "recipeExtractionModel", "geminiApiKeyEncrypted" FROM "Household" WHERE id = $1 LIMIT 1`,
        [household.id]
      )

      if (hRes.rows.length === 0) {
        return reply.status(401).send({ error: 'Unauthorized.' })
      }

      const hRow = hRes.rows[0]
      const result = await importRecipeFromWebUrl({
        householdId: household.id,
        sourceUrl: body.sourceUrl.trim(),
        model: hRow.recipeExtractionModel,
        householdGeminiApiKeyEncrypted: hRow.geminiApiKeyEncrypted,
      })

      return reply.send({
        recipe: { id: result.recipeId },
        imageImportWarning: result.imageImportWarning,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      request.log.error({ err, sourceUrl: body.sourceUrl }, 'Recipe import from web URL failed')
      if (message === MISSING_GEMINI_API_KEY_ERROR) {
        return reply.status(400).send({ error: message })
      }
      return reply.status(500).send({ error: message })
    }
  })

  // Import recipe from text
  fastify.post('/import/text', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = request.body as { importText?: string }

    const importText = validateImportText(body?.importText)
    if (!importText) {
      return reply.status(400).send({ error: 'Invalid import text.' })
    }

    try {
      const hRes = await query<{
        recipeExtractionModel: 'GEMINI_FREE'
        geminiApiKeyEncrypted: string | null
      }>(
        `SELECT "recipeExtractionModel", "geminiApiKeyEncrypted" FROM "Household" WHERE id = $1 LIMIT 1`,
        [household.id]
      )

      if (hRes.rows.length === 0) {
        return reply.status(401).send({ error: 'Unauthorized.' })
      }

      const hRow = hRes.rows[0]
      const result = await importRecipeFromText({
        householdId: household.id,
        importText,
        model: hRow.recipeExtractionModel,
        householdGeminiApiKeyEncrypted: hRow.geminiApiKeyEncrypted,
      })

      return reply.send({
        recipe: { id: result.recipeId },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      request.log.error({ err }, 'Recipe import from text failed')
      if (message === MISSING_GEMINI_API_KEY_ERROR) {
        return reply.status(400).send({ error: message })
      }
      return reply.status(500).send({ error: message })
    }
  })

  // Delete recipe
  fastify.delete('/:recipeId', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { recipeId } = request.params as { recipeId: string }

    const res = await query(
      `DELETE FROM "Recipe" WHERE id = $1 AND "householdId" = $2 RETURNING id, "imagePath"`,
      [recipeId, household.id]
    )

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Recipe not found' })
    }

    const imagePath = res.rows[0].imagePath as string | null
    if (imagePath && imagePath.startsWith('/uploads/')) {
      const cleanRelativePath = imagePath.replace(/^\/+/, '')
      const possiblePaths = [
        path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), cleanRelativePath.replace(/^uploads\//, '')),
        path.join(process.cwd(), 'public', cleanRelativePath),
        path.join(process.cwd(), cleanRelativePath),
      ]

      for (const diskPath of possiblePaths) {
        try {
          if (fs.existsSync(diskPath)) {
            fs.unlinkSync(diskPath)
            break
          }
        } catch (err) {
          request.log.error({ err, diskPath }, 'Failed to delete recipe image file from disk')
        }
      }
    }

    return reply.send({ success: true })
  })
}
