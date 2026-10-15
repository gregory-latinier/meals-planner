import { FastifyPluginAsync } from 'fastify'
import type { QueryResult, QueryResultRow } from 'pg'
import { Server as SocketIOServer } from 'socket.io'
import { query, withTransaction } from '../db/index'
import { generateId, householdRoom, requireAuth } from '../lib/auth'
import {
  aggregateIngredientRows,
  mergeQuantities,
  normalizeItemName,
  type IngredientRowInput,
  type QuantityEntry,
} from '../lib/shopping-list-aggregation'

interface ShoppingListRouteOptions {
  io?: SocketIOServer
}

const MAX_NAME_LENGTH = 300
const MAX_QUANTITY_TEXT_LENGTH = 200
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface ItemRow {
  id: string
  listId: string
  ingredientId: string | null
  name: string
  nameNormalized: string
  quantities: QuantityEntry[]
  quantityText: string | null
  storeId: string | null
  storeName: string | null
  source: 'RECIPE' | 'MANUAL'
  pantryCheck: boolean
  checked: boolean
  checkedAt: string | null
  position: number
  createdAt: string
  updatedAt: string
}

interface NewEntry {
  ingredientId: string | null
  name: string
  nameNormalized: string
  quantities: QuantityEntry[]
  quantityText: string | null
  source: 'RECIPE' | 'MANUAL'
  pantryCheck: boolean
  /** Explicit store; when undefined the store is resolved from past lists. */
  storeId?: string | null
}

interface Executor {
  query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>
}

const ITEM_SELECT = `
  SELECT i.id, i."listId", i."ingredientId", i.name, i."nameNormalized", i.quantities,
         i."quantityText", i."storeId", s.name AS "storeName", i.source, i."pantryCheck",
         i.checked, i."checkedAt", i.position, i."createdAt", i."updatedAt"
  FROM "ShoppingListItem" i
  LEFT JOIN "Store" s ON s.id = i."storeId"
`

async function loadItems(db: Executor, listId: string): Promise<ItemRow[]> {
  const res = await db.query<ItemRow>(
    `${ITEM_SELECT} WHERE i."listId" = $1 ORDER BY i.checked ASC, i.position ASC, i."createdAt" ASC`,
    [listId]
  )
  return res.rows
}

async function loadItem(db: Executor, itemId: string): Promise<ItemRow | null> {
  const res = await db.query<ItemRow>(`${ITEM_SELECT} WHERE i.id = $1`, [itemId])
  return res.rows[0] ?? null
}

/** Returns the household's active list, creating it when missing. */
async function getOrCreateActiveList(db: Executor, householdId: string): Promise<string> {
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM "ShoppingList" WHERE "householdId" = $1 AND status = 'ACTIVE' LIMIT 1`,
    [householdId]
  )
  if (existing.rows[0]) return existing.rows[0].id

  await db.query(
    `INSERT INTO "ShoppingList" (id, "householdId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, 'ACTIVE', NOW(), NOW())
     ON CONFLICT ("householdId") WHERE status = 'ACTIVE' DO NOTHING`,
    [generateId('sl'), householdId]
  )
  const created = await db.query<{ id: string }>(
    `SELECT id FROM "ShoppingList" WHERE "householdId" = $1 AND status = 'ACTIVE' LIMIT 1`,
    [householdId]
  )
  return created.rows[0].id
}

/**
 * Finds, for each candidate, the store used the last time the same ingredient (or,
 * failing that, the same item name) was put on one of the household's lists.
 */
async function resolveStores(
  db: Executor,
  householdId: string,
  candidates: { ingredientId: string | null; nameNormalized: string }[]
): Promise<(string | null)[]> {
  const ingredientIds = Array.from(new Set(candidates.map((c) => c.ingredientId).filter((v): v is string => !!v)))
  const names = Array.from(new Set(candidates.map((c) => c.nameNormalized)))

  const byIngredient = new Map<string, string>()
  if (ingredientIds.length > 0) {
    const res = await db.query<{ key: string; storeId: string }>(
      `SELECT DISTINCT ON (i."ingredientId") i."ingredientId" AS key, i."storeId"
       FROM "ShoppingListItem" i
       JOIN "ShoppingList" l ON l.id = i."listId"
       WHERE l."householdId" = $1 AND i."ingredientId" = ANY($2) AND i."storeId" IS NOT NULL
       ORDER BY i."ingredientId", i."updatedAt" DESC`,
      [householdId, ingredientIds]
    )
    for (const row of res.rows) byIngredient.set(row.key, row.storeId)
  }

  const byName = new Map<string, string>()
  if (names.length > 0) {
    const res = await db.query<{ key: string; storeId: string }>(
      `SELECT DISTINCT ON (i."nameNormalized") i."nameNormalized" AS key, i."storeId"
       FROM "ShoppingListItem" i
       JOIN "ShoppingList" l ON l.id = i."listId"
       WHERE l."householdId" = $1 AND i."nameNormalized" = ANY($2) AND i."storeId" IS NOT NULL
       ORDER BY i."nameNormalized", i."updatedAt" DESC`,
      [householdId, names]
    )
    for (const row of res.rows) byName.set(row.key, row.storeId)
  }

  return candidates.map(
    (c) => (c.ingredientId ? byIngredient.get(c.ingredientId) : undefined) ?? byName.get(c.nameNormalized) ?? null
  )
}

function joinTexts(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b || a === b) return a
  return `${a} + ${b}`
}

/**
 * Adds entries to a list, merging into the unchecked item of the same ingredient / name
 * when there is one. Returns how many items were created and merged.
 */
async function addEntriesToList(
  db: Executor,
  householdId: string,
  listId: string,
  entries: NewEntry[]
): Promise<{ added: number; merged: number; pantryAdded: number }> {
  if (entries.length === 0) return { added: 0, merged: 0, pantryAdded: 0 }

  const openRes = await db.query<{
    id: string
    ingredientId: string | null
    nameNormalized: string
    quantities: QuantityEntry[]
    quantityText: string | null
  }>(
    `SELECT id, "ingredientId", "nameNormalized", quantities, "quantityText"
     FROM "ShoppingListItem" WHERE "listId" = $1 AND checked = false`,
    [listId]
  )
  const open = openRes.rows

  const posRes = await db.query<{ max: number | null }>(
    `SELECT MAX(position) AS max FROM "ShoppingListItem" WHERE "listId" = $1`,
    [listId]
  )
  let position = (posRes.rows[0]?.max ?? -1) + 1

  const toInsert: NewEntry[] = []
  let merged = 0

  for (const entry of entries) {
    const target = open.find((item) =>
      entry.ingredientId ? item.ingredientId === entry.ingredientId : item.nameNormalized === entry.nameNormalized
    )
    if (target) {
      target.quantities = mergeQuantities(target.quantities, entry.quantities)
      target.quantityText = joinTexts(target.quantityText, entry.quantityText)
      await db.query(
        `UPDATE "ShoppingListItem" SET quantities = $2::jsonb, "quantityText" = $3, "updatedAt" = NOW() WHERE id = $1`,
        [target.id, JSON.stringify(target.quantities), target.quantityText]
      )
      merged++
      continue
    }

    // Entries of the same batch that target the same item are merged together.
    const sameBatch = toInsert.find((e) =>
      entry.ingredientId ? e.ingredientId === entry.ingredientId : e.nameNormalized === entry.nameNormalized
    )
    if (sameBatch) {
      sameBatch.quantities = mergeQuantities(sameBatch.quantities, entry.quantities)
      sameBatch.quantityText = joinTexts(sameBatch.quantityText, entry.quantityText)
      merged++
      continue
    }
    toInsert.push({ ...entry, quantities: entry.quantities.map((q) => ({ ...q })) })
  }

  const needStore = toInsert.filter((e) => e.storeId === undefined)
  const resolved = await resolveStores(db, householdId, needStore)
  const resolvedByEntry = new Map(needStore.map((e, index) => [e, resolved[index]]))

  let pantryAdded = 0
  for (const entry of toInsert) {
    const storeId = entry.storeId !== undefined ? entry.storeId : (resolvedByEntry.get(entry) ?? null)
    await db.query(
      `INSERT INTO "ShoppingListItem" (
         id, "listId", "ingredientId", name, "nameNormalized", quantities, "quantityText",
         "storeId", source, "pantryCheck", checked, position, "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, false, $11, NOW(), NOW())`,
      [
        generateId('sli'),
        listId,
        entry.ingredientId,
        entry.name,
        entry.nameNormalized,
        JSON.stringify(entry.quantities),
        entry.quantityText,
        storeId,
        entry.source,
        entry.pantryCheck,
        position++,
      ]
    )
    if (entry.pantryCheck) pantryAdded++
  }

  await db.query(`UPDATE "ShoppingList" SET "updatedAt" = NOW() WHERE id = $1`, [listId])
  return { added: toInsert.length, merged, pantryAdded }
}

export const shoppingListRoutes: FastifyPluginAsync<ShoppingListRouteOptions> = async (fastify, opts) => {
  const io = opts?.io

  function notify(householdId: string, listId: string | null) {
    if (io) {
      io.to(householdRoom(householdId)).emit('household:update', {
        type: 'shopping_list:changed',
        payload: { listId },
      })
    }
  }

  async function storeBelongsToHousehold(householdId: string, storeId: string): Promise<boolean> {
    const res = await query(`SELECT 1 FROM "Store" WHERE id = $1 AND "householdId" = $2`, [storeId, householdId])
    return res.rows.length > 0
  }

  // GET /api/shopping-lists — active summary + history
  fastify.get('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const res = await query<{
      id: string
      status: 'ACTIVE' | 'COMPLETED'
      createdAt: string
      completedAt: string | null
      itemCount: number
      checkedCount: number
    }>(
      `SELECT l.id, l.status, l."createdAt", l."completedAt",
              COUNT(i.id) FILTER (WHERE NOT i."pantryCheck")::int AS "itemCount",
              COUNT(i.id) FILTER (WHERE NOT i."pantryCheck" AND i.checked)::int AS "checkedCount"
       FROM "ShoppingList" l
       LEFT JOIN "ShoppingListItem" i ON i."listId" = l.id
       WHERE l."householdId" = $1
       GROUP BY l.id
       ORDER BY l."createdAt" DESC
       LIMIT 100`,
      [household.id]
    )
    const active = res.rows.find((row) => row.status === 'ACTIVE') ?? null
    const history = res.rows.filter((row) => row.status === 'COMPLETED')
    return reply.send({ active, history })
  })

  // GET /api/shopping-lists/active
  fastify.get('/active', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const listRes = await query(
      `SELECT id, status, "createdAt", "updatedAt", "completedAt"
       FROM "ShoppingList" WHERE "householdId" = $1 AND status = 'ACTIVE' LIMIT 1`,
      [household.id]
    )
    const list = listRes.rows[0]
    if (!list) return reply.send({ list: null, items: [] })
    return reply.send({ list, items: await loadItems({ query }, list.id) })
  })

  // GET /api/shopping-lists/:id
  fastify.get('/:id', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { id } = request.params as { id: string }
    const listRes = await query(
      `SELECT id, status, "createdAt", "updatedAt", "completedAt"
       FROM "ShoppingList" WHERE id = $1 AND "householdId" = $2`,
      [id, household.id]
    )
    const list = listRes.rows[0]
    if (!list) return reply.status(404).send({ error: 'Shopping list not found' })
    return reply.send({ list, items: await loadItems({ query }, list.id) })
  })

  // POST /api/shopping-lists/active/generate { startDate, endDate }
  fastify.post('/active/generate', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = (request.body as { startDate?: string; endDate?: string }) || {}

    if (!body.startDate || !DATE_RE.test(body.startDate) || !body.endDate || !DATE_RE.test(body.endDate)) {
      return reply.status(400).send({ error: 'Valid startDate and endDate (YYYY-MM-DD) are required' })
    }
    if (body.startDate > body.endDate) {
      return reply.status(400).send({ error: 'startDate must not be after endDate' })
    }
    const { startDate, endDate } = body

    const result = await withTransaction(async (client) => {
      const listId = await getOrCreateActiveList(client, household.id)

      // Meals of the period that are not already part of this list.
      const mealsRes = await client.query<{
        id: string
        recipeId: string
        servings: number | null
        recipeServings: number | null
      }>(
        `SELECT mp.id, mp."recipeId", mp.servings, r.servings AS "recipeServings"
         FROM "MealPlanItem" mp
         JOIN "Recipe" r ON r.id = mp."recipeId" AND r."householdId" = mp."householdId"
         WHERE mp."householdId" = $1
           AND (
             (mp.date >= $2 AND mp.date <= $3)
             OR (mp.date IS NULL AND mp."weekStartDate" >= $2 AND mp."weekStartDate" <= $3)
           )
           AND NOT EXISTS (
             SELECT 1 FROM "ShoppingListMealPlanItem" link
             WHERE link."listId" = $4 AND link."mealPlanItemId" = mp.id
           )`,
        [household.id, startDate, endDate, listId]
      )
      const meals = mealsRes.rows

      if (meals.length === 0) {
        return { listId, added: 0, merged: 0, pantryCheck: 0, meals: 0 }
      }

      const recipeIds = Array.from(new Set(meals.map((m) => m.recipeId)))
      const rowsRes = await client.query<{
        recipeId: string
        ingredientId: string | null
        ingredientName: string | null
        quantity: string | null
        unitId: string | null
        unitName: string | null
        note: string | null
      }>(
        `SELECT rir."recipeId", rir."ingredientId", ing.name AS "ingredientName",
                rir.quantity, rir."unitId", u.name AS "unitName", rir.note
         FROM "RecipeIngredientRow" rir
         LEFT JOIN "Ingredient" ing ON ing.id = rir."ingredientId"
         LEFT JOIN "Unit" u ON u.id = rir."unitId"
         WHERE rir."recipeId" = ANY($1) AND rir.kind = 'ITEM'
         ORDER BY rir."recipeId", rir.position`,
        [recipeIds]
      )
      const rowsByRecipe = new Map<string, typeof rowsRes.rows>()
      for (const row of rowsRes.rows) {
        const list = rowsByRecipe.get(row.recipeId) ?? []
        list.push(row)
        rowsByRecipe.set(row.recipeId, list)
      }

      const inputs: IngredientRowInput[] = []
      for (const meal of meals) {
        const factor = meal.servings && meal.recipeServings ? meal.servings / meal.recipeServings : 1
        for (const row of rowsByRecipe.get(meal.recipeId) ?? []) {
          inputs.push({
            ingredientId: row.ingredientId,
            ingredientName: row.ingredientName,
            quantity: row.quantity,
            unitId: row.unitId,
            unitName: row.unitName,
            note: row.note,
            factor,
          })
        }
      }
      const aggregated = aggregateIngredientRows(inputs)

      const ingredientIds = aggregated.map((a) => a.ingredientId).filter((v): v is string => !!v)
      const stockRes = ingredientIds.length
        ? await client.query<{ id: string; alwaysInStock: boolean }>(
            `SELECT id, "alwaysInStock" FROM "Ingredient" WHERE id = ANY($1) AND "householdId" = $2`,
            [ingredientIds, household.id]
          )
        : { rows: [] as { id: string; alwaysInStock: boolean }[] }
      const inStock = new Set(stockRes.rows.filter((r) => r.alwaysInStock).map((r) => r.id))

      const counts = await addEntriesToList(
        client,
        household.id,
        listId,
        aggregated.map((item) => ({
          ingredientId: item.ingredientId,
          name: item.name,
          nameNormalized: item.nameNormalized,
          quantities: item.quantities,
          quantityText: null,
          source: 'RECIPE' as const,
          pantryCheck: item.ingredientId ? inStock.has(item.ingredientId) : false,
        }))
      )

      await client.query(
        `INSERT INTO "ShoppingListMealPlanItem" ("listId", "mealPlanItemId")
         SELECT $1, UNNEST($2::text[]) ON CONFLICT DO NOTHING`,
        [listId, meals.map((m) => m.id)]
      )

      return {
        listId,
        added: counts.added,
        merged: counts.merged,
        pantryCheck: counts.pantryAdded,
        meals: meals.length,
      }
    })

    notify(household.id, result.listId)
    return reply.send(result)
  })

  // POST /api/shopping-lists/active/items { name, quantityText?, storeId? }
  fastify.post('/active/items', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = (request.body as { name?: string; quantityText?: string | null; storeId?: string | null }) || {}

    const name = body.name?.trim()
    if (!name || name.length > MAX_NAME_LENGTH) {
      return reply.status(400).send({ error: `Name is required (max ${MAX_NAME_LENGTH} chars)` })
    }
    const quantityText = body.quantityText?.trim() || null
    if (quantityText && quantityText.length > MAX_QUANTITY_TEXT_LENGTH) {
      return reply.status(400).send({ error: `Quantity is too long (max ${MAX_QUANTITY_TEXT_LENGTH} chars)` })
    }
    if (body.storeId && !(await storeBelongsToHousehold(household.id, body.storeId))) {
      return reply.status(400).send({ error: 'Invalid store' })
    }

    const nameNormalized = normalizeItemName(name)

    const { listId, itemId } = await withTransaction(async (client) => {
      const listId = await getOrCreateActiveList(client, household.id)

      // Link to a known ingredient so store memory and "always in stock" are shared with recipes.
      const ingRes = await client.query<{ id: string }>(
        `SELECT id FROM "Ingredient" WHERE "householdId" = $1 AND "nameNormalized" = $2 LIMIT 1`,
        [household.id, nameNormalized]
      )
      const ingredientId = ingRes.rows[0]?.id ?? null

      await addEntriesToList(client, household.id, listId, [
        {
          ingredientId,
          name,
          nameNormalized,
          quantities: [],
          quantityText,
          source: 'MANUAL',
          pantryCheck: false,
          storeId: body.storeId ? body.storeId : undefined,
        },
      ])

      const found = await client.query<{ id: string }>(
        `SELECT id FROM "ShoppingListItem"
         WHERE "listId" = $1 AND "nameNormalized" = $2 AND checked = false
         ORDER BY "updatedAt" DESC LIMIT 1`,
        [listId, nameNormalized]
      )
      return { listId, itemId: found.rows[0].id }
    })

    notify(household.id, listId)
    const item = await loadItem({ query }, itemId)
    return reply.status(201).send({ item })
  })

  // POST /api/shopping-lists/active/items/copy { itemIds }
  fastify.post('/active/items/copy', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = (request.body as { itemIds?: unknown }) || {}

    if (
      !Array.isArray(body.itemIds) ||
      body.itemIds.length === 0 ||
      body.itemIds.length > 500 ||
      !body.itemIds.every((v) => typeof v === 'string')
    ) {
      return reply.status(400).send({ error: 'itemIds must be a non-empty array of ids' })
    }
    const itemIds = body.itemIds as string[]

    const result = await withTransaction(async (client) => {
      const srcRes = await client.query<{
        ingredientId: string | null
        name: string
        nameNormalized: string
        quantities: QuantityEntry[]
        quantityText: string | null
        storeId: string | null
        source: 'RECIPE' | 'MANUAL'
      }>(
        `SELECT i."ingredientId", i.name, i."nameNormalized", i.quantities, i."quantityText", i."storeId", i.source
         FROM "ShoppingListItem" i
         JOIN "ShoppingList" l ON l.id = i."listId"
         WHERE i.id = ANY($1) AND l."householdId" = $2
         ORDER BY i.position`,
        [itemIds, household.id]
      )
      if (srcRes.rows.length === 0) return null

      const listId = await getOrCreateActiveList(client, household.id)
      const counts = await addEntriesToList(
        client,
        household.id,
        listId,
        srcRes.rows.map((row) => ({
          ingredientId: row.ingredientId,
          name: row.name,
          nameNormalized: row.nameNormalized,
          quantities: row.quantities,
          quantityText: row.quantityText,
          source: row.source,
          // Explicitly re-added by the user: never hide it in the pantry section.
          pantryCheck: false,
          storeId: row.storeId ?? undefined,
        }))
      )
      return { listId, ...counts }
    })

    if (!result) return reply.status(404).send({ error: 'No matching items found' })
    notify(household.id, result.listId)
    return reply.send({ added: result.added, merged: result.merged })
  })

  // PATCH /api/shopping-lists/items/:itemId
  fastify.patch('/items/:itemId', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { itemId } = request.params as { itemId: string }
    const body = (request.body as {
      checked?: boolean
      name?: string
      quantityText?: string | null
      storeId?: string | null
      pantryCheck?: boolean
    }) || {}

    const sets: string[] = []
    const params: unknown[] = []
    const push = (column: string, value: unknown, cast = '') => {
      params.push(value)
      sets.push(`${column} = $${params.length}${cast}`)
    }

    if (body.checked !== undefined) {
      if (typeof body.checked !== 'boolean') return reply.status(400).send({ error: 'checked must be a boolean' })
      push('checked', body.checked)
      sets.push(`"checkedAt" = ${body.checked ? 'NOW()' : 'NULL'}`)
    }

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name || name.length > MAX_NAME_LENGTH) {
        return reply.status(400).send({ error: `Name is required (max ${MAX_NAME_LENGTH} chars)` })
      }
      push('name', name)
      push('"nameNormalized"', normalizeItemName(name))
    }

    if (body.quantityText !== undefined) {
      const text = typeof body.quantityText === 'string' ? body.quantityText.trim() : ''
      if (text.length > MAX_QUANTITY_TEXT_LENGTH) {
        return reply.status(400).send({ error: `Quantity is too long (max ${MAX_QUANTITY_TEXT_LENGTH} chars)` })
      }
      // Editing the quantity replaces whatever was computed from recipes.
      push('"quantityText"', text || null)
      sets.push(`quantities = '[]'::jsonb`)
    }

    if (body.storeId !== undefined) {
      if (body.storeId !== null) {
        if (typeof body.storeId !== 'string' || !(await storeBelongsToHousehold(household.id, body.storeId))) {
          return reply.status(400).send({ error: 'Invalid store' })
        }
      }
      push('"storeId"', body.storeId)
    }

    if (body.pantryCheck !== undefined) {
      if (typeof body.pantryCheck !== 'boolean') return reply.status(400).send({ error: 'pantryCheck must be a boolean' })
      push('"pantryCheck"', body.pantryCheck)
    }

    if (sets.length === 0) return reply.status(400).send({ error: 'Nothing to update' })

    params.push(itemId, household.id)
    const res = await query<{ listId: string }>(
      `UPDATE "ShoppingListItem" i
       SET ${sets.join(', ')}, "updatedAt" = NOW()
       FROM "ShoppingList" l
       WHERE i.id = $${params.length - 1} AND l.id = i."listId"
         AND l."householdId" = $${params.length} AND l.status = 'ACTIVE'
       RETURNING i."listId"`,
      params
    )
    if (res.rows.length === 0) return reply.status(404).send({ error: 'Item not found' })

    notify(household.id, res.rows[0].listId)
    return reply.send({ item: await loadItem({ query }, itemId) })
  })

  // DELETE /api/shopping-lists/items/:itemId?alwaysInStock=true
  fastify.delete('/items/:itemId', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { itemId } = request.params as { itemId: string }
    const { alwaysInStock } = (request.query as { alwaysInStock?: string }) || {}

    const res = await query<{ listId: string; ingredientId: string | null }>(
      `DELETE FROM "ShoppingListItem" i
       USING "ShoppingList" l
       WHERE i.id = $1 AND l.id = i."listId" AND l."householdId" = $2 AND l.status = 'ACTIVE'
       RETURNING i."listId", i."ingredientId"`,
      [itemId, household.id]
    )
    if (res.rows.length === 0) return reply.status(404).send({ error: 'Item not found' })

    const { listId, ingredientId } = res.rows[0]
    if (alwaysInStock === 'true' && ingredientId) {
      await query(
        `UPDATE "Ingredient" SET "alwaysInStock" = true, "updatedAt" = NOW() WHERE id = $1 AND "householdId" = $2`,
        [ingredientId, household.id]
      )
    }

    notify(household.id, listId)
    return reply.send({ success: true, id: itemId })
  })

  // PUT /api/shopping-lists/ingredients/:ingredientId/in-stock { alwaysInStock }
  fastify.put('/ingredients/:ingredientId/in-stock', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { ingredientId } = request.params as { ingredientId: string }
    const body = (request.body as { alwaysInStock?: boolean }) || {}

    if (typeof body.alwaysInStock !== 'boolean') {
      return reply.status(400).send({ error: 'alwaysInStock must be a boolean' })
    }

    const res = await query(
      `UPDATE "Ingredient" SET "alwaysInStock" = $1, "updatedAt" = NOW()
       WHERE id = $2 AND "householdId" = $3 RETURNING id`,
      [body.alwaysInStock, ingredientId, household.id]
    )
    if (res.rows.length === 0) return reply.status(404).send({ error: 'Ingredient not found' })

    // Keep the current list consistent with the new setting.
    const listRes = await query<{ id: string }>(
      `UPDATE "ShoppingListItem" i
       SET "pantryCheck" = $1, "updatedAt" = NOW()
       FROM "ShoppingList" l
       WHERE i."ingredientId" = $2 AND i.checked = false AND l.id = i."listId"
         AND l."householdId" = $3 AND l.status = 'ACTIVE'
       RETURNING l.id`,
      [body.alwaysInStock, ingredientId, household.id]
    )

    notify(household.id, listRes.rows[0]?.id ?? null)
    return reply.send({ success: true, alwaysInStock: body.alwaysInStock })
  })

  // POST /api/shopping-lists/active/complete { carryOver }
  fastify.post('/active/complete', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = (request.body as { carryOver?: boolean }) || {}
    const carryOver = body.carryOver === true

    const result = await withTransaction(async (client) => {
      const listRes = await client.query<{ id: string }>(
        `UPDATE "ShoppingList" SET status = 'COMPLETED', "completedAt" = NOW(), "updatedAt" = NOW()
         WHERE "householdId" = $1 AND status = 'ACTIVE' RETURNING id`,
        [household.id]
      )
      const completedId = listRes.rows[0]?.id
      if (!completedId) return null

      let carried = 0
      if (carryOver) {
        const leftovers = await client.query<{
          ingredientId: string | null
          name: string
          nameNormalized: string
          quantities: QuantityEntry[]
          quantityText: string | null
          storeId: string | null
          source: 'RECIPE' | 'MANUAL'
          pantryCheck: boolean
          position: number
        }>(
          `SELECT "ingredientId", name, "nameNormalized", quantities, "quantityText", "storeId",
                  source, "pantryCheck", position
           FROM "ShoppingListItem" WHERE "listId" = $1 AND checked = false
           ORDER BY position`,
          [completedId]
        )

        if (leftovers.rows.length > 0) {
          const newListId = await getOrCreateActiveList(client, household.id)
          for (const row of leftovers.rows) {
            await client.query(
              `INSERT INTO "ShoppingListItem" (
                 id, "listId", "ingredientId", name, "nameNormalized", quantities, "quantityText",
                 "storeId", source, "pantryCheck", checked, position, "createdAt", "updatedAt"
               )
               VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, false, $11, NOW(), NOW())`,
              [
                generateId('sli'),
                newListId,
                row.ingredientId,
                row.name,
                row.nameNormalized,
                JSON.stringify(row.quantities),
                row.quantityText,
                row.storeId,
                row.source,
                row.pantryCheck,
                row.position,
              ]
            )
          }
          // Keep meal links so regenerating the same period does not double the carried items.
          await client.query(
            `INSERT INTO "ShoppingListMealPlanItem" ("listId", "mealPlanItemId")
             SELECT $1, "mealPlanItemId" FROM "ShoppingListMealPlanItem" WHERE "listId" = $2
             ON CONFLICT DO NOTHING`,
            [newListId, completedId]
          )
          carried = leftovers.rows.length
        }
      }

      return { completedId, carried }
    })

    if (!result) return reply.status(404).send({ error: 'No active shopping list' })
    notify(household.id, result.completedId)
    return reply.send({ success: true, id: result.completedId, carried: result.carried })
  })
}
