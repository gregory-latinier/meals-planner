import { FastifyPluginAsync } from 'fastify'
import { query } from '../db/index'
import { generateId, requireAuth } from '../lib/auth'

export const taxonomyRoutes: FastifyPluginAsync = async (fastify) => {
  // Units
  fastify.get('/units', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const res = await query(
      `SELECT * FROM "Unit" WHERE "householdId" = $1 ORDER BY "nameNormalized" ASC`,
      [household.id]
    )
    return reply.send({ units: res.rows })
  })

  fastify.post('/units', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { name } = (request.body as { name?: string }) || {}
    const trimmed = name?.trim()

    if (!trimmed || trimmed.length > 100) {
      return reply.status(400).send({ error: 'Valid unit name required (max 100 chars)' })
    }

    const nameNormalized = trimmed.toLowerCase()
    const id = generateId('un')

    const res = await query(
      `INSERT INTO "Unit" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "updatedAt" = NOW()
       RETURNING *`,
      [id, household.id, trimmed, nameNormalized]
    )

    return reply.status(201).send({ unit: res.rows[0] })
  })

  // Ingredients
  fastify.get('/ingredients', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const res = await query(
      `SELECT * FROM "Ingredient" WHERE "householdId" = $1 ORDER BY "nameNormalized" ASC`,
      [household.id]
    )
    return reply.send({ ingredients: res.rows })
  })

  fastify.post('/ingredients', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { name } = (request.body as { name?: string }) || {}
    const trimmed = name?.trim()

    if (!trimmed || trimmed.length > 300) {
      return reply.status(400).send({ error: 'Valid ingredient name required (max 300 chars)' })
    }

    const nameNormalized = trimmed.toLowerCase()
    const id = generateId('ing')

    const res = await query(
      `INSERT INTO "Ingredient" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "updatedAt" = NOW()
       RETURNING *`,
      [id, household.id, trimmed, nameNormalized]
    )

    return reply.status(201).send({ ingredient: res.rows[0] })
  })

  // Recipe Tags
  fastify.get('/recipe-tags', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const res = await query(
      `SELECT * FROM "RecipeTag" WHERE "householdId" = $1 ORDER BY "nameNormalized" ASC`,
      [household.id]
    )
    return reply.send({ tags: res.rows })
  })

  fastify.post('/recipe-tags', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { name } = (request.body as { name?: string }) || {}
    const trimmed = name?.trim()

    if (!trimmed || trimmed.length > 100) {
      return reply.status(400).send({ error: 'Valid tag name required (max 100 chars)' })
    }

    const nameNormalized = trimmed.toLowerCase()
    const id = generateId('tag')

    const res = await query(
      `INSERT INTO "RecipeTag" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "updatedAt" = NOW()
       RETURNING *`,
      [id, household.id, trimmed, nameNormalized]
    )

    return reply.status(201).send({ tag: res.rows[0] })
  })
}
