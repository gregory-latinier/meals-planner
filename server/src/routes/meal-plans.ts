import { FastifyPluginAsync } from 'fastify'
import { Server as SocketIOServer } from 'socket.io'
import { query } from '../db/index'
import { generateId, householdRoom, requireAuth } from '../lib/auth'

interface MealPlansRouteOptions {
  io?: SocketIOServer
}

export function getIsoMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.getUTCDay() // 0 is Sunday, 1 is Monday, ...
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1)
  date.setUTCDate(diff)
  return date.toISOString().slice(0, 10)
}

export const mealPlanRoutes: FastifyPluginAsync<MealPlansRouteOptions> = async (fastify, opts) => {
  const io = opts?.io

  function broadcastRealtime(householdId: string, type: string, payload: unknown) {
    if (io) {
      io.to(householdRoom(householdId)).emit('household:update', { type, payload })
    }
  }

  // GET /api/meal-plans
  // Query params: startDate, endDate, weekStartDate
  fastify.get('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { startDate, endDate, weekStartDate } = (request.query as {
      startDate?: string
      endDate?: string
      weekStartDate?: string
    }) || {}

    let sql = `
      SELECT mp.id,
             mp."householdId",
             mp."recipeId",
             mp.title,
             to_char(mp.date, 'YYYY-MM-DD') as date,
             to_char(mp."weekStartDate", 'YYYY-MM-DD') as "weekStartDate",
             mp."mealType",
             mp.servings,
             mp.completed,
             mp.notes,
             mp.position,
             mp."createdAt",
             mp."updatedAt",
              r.title as "recipeTitle",
              r."imagePath" as "recipeCoverImagePath",
              r."prepMinutes" as "recipePrepMinutes"
       FROM "MealPlanItem" mp
      LEFT JOIN "Recipe" r ON r.id = mp."recipeId"
      WHERE mp."householdId" = $1
    `
    const params: unknown[] = [household.id]

    if (startDate && endDate) {
      params.push(startDate, endDate)
      sql += ` AND (
        (mp.date >= $${params.length - 1} AND mp.date <= $${params.length})
        OR (mp.date IS NULL AND mp."weekStartDate" >= $${params.length - 1} AND mp."weekStartDate" <= $${params.length})
      )`
    } else if (weekStartDate) {
      params.push(weekStartDate)
      sql += ` AND mp."weekStartDate" = $${params.length}`
    }

    sql += ` ORDER BY mp.date ASC NULLS FIRST, mp.position ASC, mp."createdAt" ASC`

    const res = await query(sql, params)
    return reply.send({ mealPlans: res.rows })
  })

  // POST /api/meal-plans
  fastify.post('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const body = (request.body as {
      title?: string
      recipeId?: string | null
      date?: string | null
      weekStartDate?: string
      mealType?: string
      servings?: number | null
      notes?: string | null
      position?: number
    }) || {}

    const trimmedTitle = body.title?.trim()
    if (!trimmedTitle || trimmedTitle.length > 500) {
      return reply.status(400).send({ error: 'Title is required (max 500 chars)' })
    }

    if (!body.weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)) {
      return reply.status(400).send({ error: 'Valid weekStartDate (YYYY-MM-DD) is required' })
    }

    if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return reply.status(400).send({ error: 'Invalid date format (must be YYYY-MM-DD or null)' })
    }

    const mealType = body.mealType?.trim() || 'dinner'
    const id = generateId('mp')

    // If recipeId is provided, verify it belongs to this household
    let recipeId = body.recipeId || null
    if (recipeId) {
      const recCheck = await query(
        `SELECT id, title, "imagePath" FROM "Recipe" WHERE id = $1 AND "householdId" = $2`,
        [recipeId, household.id]
      )
      if (recCheck.rows.length === 0) {
        recipeId = null
      }
    }

    let initialServings = body.servings ?? null
    if (initialServings === null || initialServings === undefined) {
      const prefRes = await query<{ defaultMealPlanServings: number }>(
        `SELECT "defaultMealPlanServings" FROM "HouseholdPreferences" WHERE "householdId" = $1 LIMIT 1`,
        [household.id]
      )
      initialServings = prefRes.rows[0]?.defaultMealPlanServings ?? 4
    }

    const res = await query(
      `INSERT INTO "MealPlanItem" (
         "id", "householdId", "recipeId", "title", "date", "weekStartDate", 
         "mealType", "servings", "completed", "notes", "position", "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, NOW(), NOW())
       RETURNING id, "householdId", "recipeId", title,
                 to_char(date, 'YYYY-MM-DD') as date,
                 to_char("weekStartDate", 'YYYY-MM-DD') as "weekStartDate",
                 "mealType", servings, completed, notes, position, "createdAt", "updatedAt"`,
      [
        id,
        household.id,
        recipeId,
        trimmedTitle,
        body.date || null,
        body.weekStartDate,
        mealType,
        initialServings,
        body.notes?.trim() || null,
        body.position ?? 0,
      ]
    )

    const created = res.rows[0]
    // Fetch recipe info if linked
    if (created.recipeId) {
      const r = await query(
        `SELECT title as "recipeTitle", "imagePath" as "recipeCoverImagePath", "prepMinutes" as "recipePrepMinutes" FROM "Recipe" WHERE id = $1`,
        [created.recipeId]
      )
      if (r.rows[0]) {
        created.recipeTitle = r.rows[0].recipeTitle
        created.recipeCoverImagePath = r.rows[0].recipeCoverImagePath
        created.recipePrepMinutes = r.rows[0].recipePrepMinutes
      }
    }

    broadcastRealtime(household.id, 'meal_plan:created', created)
    return reply.status(201).send({ mealPlan: created })
  })

  // PUT /api/meal-plans/:id
  fastify.put('/:id', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { id } = request.params as { id: string }
    const body = (request.body as {
      title?: string
      recipeId?: string | null
      date?: string | null
      weekStartDate?: string
      mealType?: string
      servings?: number | null
      completed?: boolean
      notes?: string | null
      position?: number
    }) || {}

    // Verify item exists and belongs to household
    const existingRes = await query(
      `SELECT * FROM "MealPlanItem" WHERE id = $1 AND "householdId" = $2`,
      [id, household.id]
    )
    if (existingRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Meal plan item not found' })
    }
    const existing = existingRes.rows[0]

    const title = body.title !== undefined ? body.title.trim() : existing.title
    if (!title || title.length > 500) {
      return reply.status(400).send({ error: 'Title cannot be empty' })
    }

    const date = body.date !== undefined ? body.date : existing.date
    let weekStartDate = body.weekStartDate !== undefined ? body.weekStartDate : existing.weekStartDate
    if (body.date && body.weekStartDate === undefined && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      weekStartDate = getIsoMonday(body.date)
    }
    const mealType = body.mealType !== undefined ? body.mealType.trim() : existing.mealType
    const servings = body.servings !== undefined ? body.servings : existing.servings
    const completed = body.completed !== undefined ? Boolean(body.completed) : existing.completed
    const notes = body.notes !== undefined ? (body.notes ? body.notes.trim() : null) : existing.notes
    const position = body.position !== undefined ? body.position : existing.position

    let recipeId = body.recipeId !== undefined ? body.recipeId : existing.recipeId
    if (recipeId) {
      const recCheck = await query(
        `SELECT id FROM "Recipe" WHERE id = $1 AND "householdId" = $2`,
        [recipeId, household.id]
      )
      if (recCheck.rows.length === 0) {
        recipeId = null
      }
    }

    const updateRes = await query(
      `UPDATE "MealPlanItem"
       SET "title" = $1,
           "recipeId" = $2,
           "date" = $3,
           "weekStartDate" = $4,
           "mealType" = $5,
           "servings" = $6,
           "completed" = $7,
           "notes" = $8,
           "position" = $9,
           "updatedAt" = NOW()
       WHERE id = $10 AND "householdId" = $11
       RETURNING id, "householdId", "recipeId", title,
                 to_char(date, 'YYYY-MM-DD') as date,
                 to_char("weekStartDate", 'YYYY-MM-DD') as "weekStartDate",
                 "mealType", servings, completed, notes, position, "createdAt", "updatedAt"`,
      [title, recipeId, date, weekStartDate, mealType, servings, completed, notes, position, id, household.id]
    )

    const updated = updateRes.rows[0]
    if (updated.recipeId) {
      const r = await query(
        `SELECT title as "recipeTitle", "imagePath" as "recipeCoverImagePath", "prepMinutes" as "recipePrepMinutes" FROM "Recipe" WHERE id = $1`,
        [updated.recipeId]
      )
      if (r.rows[0]) {
        updated.recipeTitle = r.rows[0].recipeTitle
        updated.recipeCoverImagePath = r.rows[0].recipeCoverImagePath
        updated.recipePrepMinutes = r.rows[0].recipePrepMinutes
      }
    }

    broadcastRealtime(household.id, 'meal_plan:updated', updated)
    return reply.send({ mealPlan: updated })
  })

  // DELETE /api/meal-plans/:id
  fastify.delete('/:id', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { id } = request.params as { id: string }

    const res = await query(
      `DELETE FROM "MealPlanItem" WHERE id = $1 AND "householdId" = $2 RETURNING id`,
      [id, household.id]
    )

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Meal plan item not found' })
    }

    broadcastRealtime(household.id, 'meal_plan:deleted', { id })
    return reply.send({ success: true, id })
  })
}
