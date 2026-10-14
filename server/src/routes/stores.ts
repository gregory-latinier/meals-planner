import { FastifyPluginAsync } from 'fastify'
import { query } from '../db/index'
import { generateId, requireAuth } from '../lib/auth'

export const storeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)

    const res = await query(
      `SELECT * FROM "Store" WHERE "householdId" = $1 ORDER BY "nameNormalized" ASC`,
      [household.id]
    )

    return reply.send({ stores: res.rows })
  })

  fastify.post('/', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { name } = (request.body as { name?: string }) || {}
    const trimmed = name?.trim()

    if (!trimmed || trimmed.length > 500) {
      return reply.status(400).send({ error: 'Valid store name is required (max 500 chars)' })
    }

    const nameNormalized = trimmed.toLowerCase()
    const id = generateId('st')

    try {
      const res = await query(
        `INSERT INTO "Store" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [id, household.id, trimmed, nameNormalized]
      )
      return reply.status(201).send({ store: res.rows[0] })
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ error: 'A store with this name already exists' })
      }
      throw err
    }
  })

  fastify.route({
    method: ['PUT', 'PATCH'],
    url: '/:storeId',
    handler: async (request, reply) => {
      const { household } = await requireAuth(request, reply)
      const { storeId } = request.params as { storeId: string }
      const { name } = (request.body as { name?: string }) || {}
      const trimmed = name?.trim()

      if (!trimmed || trimmed.length > 500) {
        return reply.status(400).send({ error: 'Valid store name is required' })
      }

      const nameNormalized = trimmed.toLowerCase()

      try {
        const res = await query(
          `UPDATE "Store" 
           SET "name" = $1, "nameNormalized" = $2, "updatedAt" = NOW() 
           WHERE id = $3 AND "householdId" = $4 
           RETURNING *`,
          [trimmed, nameNormalized, storeId, household.id]
        )

        if (res.rows.length === 0) {
          return reply.status(404).send({ error: 'Store not found' })
        }

        return reply.send({ store: res.rows[0] })
      } catch (err: any) {
        if (err.code === '23505') {
          return reply.status(409).send({ error: 'A store with this name already exists' })
        }
        throw err
      }
    },
  })

  fastify.delete('/:storeId', async (request, reply) => {
    const { household } = await requireAuth(request, reply)
    const { storeId } = request.params as { storeId: string }

    const res = await query(
      `DELETE FROM "Store" WHERE id = $1 AND "householdId" = $2 RETURNING id`,
      [storeId, household.id]
    )

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Store not found' })
    }

    return reply.send({ success: true })
  })
}
