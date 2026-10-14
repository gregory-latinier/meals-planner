import { FastifyPluginAsync } from 'fastify'
import { query } from '../db/index'
import { generateId, requireAuth } from '../lib/auth'

export const cookbookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { sortBy, order } = (request.query as { sortBy?: string; order?: string }) || {}

    const sortField = sortBy === 'name' ? 'c."nameNormalized"' : 'c."updatedAt"'
    const sortDirection = order === 'asc' ? 'ASC' : 'DESC'

    const res = await query(
      `SELECT c.*, 
        COUNT(r.id)::int as "recipeCount",
        COUNT(r.id)::int as "recipesCount",
        (
          SELECT r2."imagePath"
          FROM "Recipe" r2
          WHERE r2."cookbookId" = c.id
            AND r2."imagePath" IS NOT NULL
            AND TRIM(r2."imagePath") != ''
          ORDER BY r2."updatedAt" DESC, r2."createdAt" DESC
          LIMIT 1
        ) as "coverImagePath"
       FROM "Cookbook" c
       LEFT JOIN "Recipe" r ON r."cookbookId" = c.id
       WHERE c."householdId" = $1
       GROUP BY c.id
       ORDER BY ${sortField} ${sortDirection}`,
      [household.id]
    )

    return reply.send({ cookbooks: res.rows })
  })

  fastify.post('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { name } = (request.body as { name?: string }) || {}
    const trimmed = name?.trim()

    if (!trimmed || trimmed.length > 500) {
      return reply.status(400).send({ error: 'Valid name is required (max 500 chars)' })
    }

    const nameNormalized = trimmed.toLowerCase()
    const id = generateId('cb')

    try {
      const res = await query(
        `INSERT INTO "Cookbook" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [id, household.id, trimmed, nameNormalized]
      )
      return reply.status(201).send({ cookbook: res.rows[0] })
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ error: 'A cookbook with this name already exists' })
      }
      throw err
    }
  })
}
