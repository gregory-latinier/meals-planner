import { FastifyPluginAsync } from 'fastify'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import sharp from 'sharp'
import { query } from '../db/index'
import { requireAuth } from '../lib/auth'
import { generateRecipeImageWithImagen } from '../lib/recipe-image-ai'
import { deleteUnusedImages, findUnusedImages } from '../lib/unused-images'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export const imageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/recipes/image', async (request, reply) => {
    const { household } = await requireAuth(request, reply)

    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ error: 'No image uploaded' })
    }

    const buffer = await data.toBuffer()
    const metadata = await sharp(buffer).metadata()

    if (!metadata.format || !['jpeg', 'png', 'webp', 'avif'].includes(metadata.format)) {
      return reply.status(400).send({ error: 'Unsupported image format' })
    }

    const filename = `${crypto.randomUUID()}.${metadata.format}`
    const filepath = path.join(UPLOAD_DIR, filename)

    // Apply EXIF orientation (metadata is stripped on write), then resize if too large
    const info = await sharp(buffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .toFile(filepath)

    const relativeUrl = `/uploads/${filename}`

    return reply.status(201).send({
      imagePath: relativeUrl,
      imageMimeType: `image/${metadata.format}`,
      imageWidth: info.width,
      imageHeight: info.height,
      imageSizeBytes: info.size,
    })
  })

  fastify.get('/images/unused', async (request, reply) => {
    await requireAuth(request, reply)

    const unused = await findUnusedImages(UPLOAD_DIR)
    return reply.send({
      count: unused.length,
      totalBytes: unused.reduce((sum, image) => sum + image.sizeBytes, 0),
    })
  })

  fastify.delete('/images/unused', async (request, reply) => {
    await requireAuth(request, reply)

    const result = await deleteUnusedImages(UPLOAD_DIR)
    if (result.failedCount > 0) {
      request.log.error({ failedCount: result.failedCount }, 'Failed to delete some unused images')
    }
    return reply.send(result)
  })

  fastify.post('/recipes/generate-image', async (request, reply) => {
    const { household } = await requireAuth(request, reply)

    const body = (request.body as {
      title?: string
      ingredients?: string[]
      instructions?: string[]
      description?: string
      promptOverride?: string
    }) || {}

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return reply.status(400).send({ error: 'Title is required to generate an image' })
    }

    // Retrieve household settings from DB
    const res = await query(
      'SELECT "geminiApiKeyEncrypted", "recipeImageProvider" FROM "Household" WHERE "id" = $1 LIMIT 1',
      [household.id]
    )
    const householdGeminiApiKeyEncrypted = res.rows[0]?.geminiApiKeyEncrypted ?? null
    const recipeImageProvider = res.rows[0]?.recipeImageProvider ?? 'NANO_BANANA'

    try {
      const generated = await generateRecipeImageWithImagen({
        title,
        ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
        instructions: Array.isArray(body.instructions) ? body.instructions : [],
        description: typeof body.description === 'string' ? body.description : undefined,
        promptOverride: typeof body.promptOverride === 'string' ? body.promptOverride : undefined,
        householdGeminiApiKeyEncrypted,
        imageProvider: recipeImageProvider,
        uploadDir: UPLOAD_DIR,
      })

      return reply.status(201).send({
        image: {
          path: generated.path,
          mimeType: generated.mimeType,
          width: generated.width,
          height: generated.height,
          sizeBytes: generated.sizeBytes,
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('MISSING_GEMINI_API_KEY')) {
        return reply.status(400).send({
          error: 'MISSING_GEMINI_API_KEY',
          message: 'Missing Gemini API key. Please configure one in Settings.',
        })
      }
      if (message.includes('GOOGLE_IMAGE_QUOTA_EXHAUSTED')) {
        return reply.status(429).send({
          error: 'GOOGLE_IMAGE_QUOTA_EXHAUSTED',
          message: 'Google AI image quota is exhausted or billing is not enabled for this project.',
        })
      }
      if (message.includes('FREE_PROVIDER_PAYMENT_REQUIRED')) {
        return reply.status(402).send({
          error: 'FREE_PROVIDER_PAYMENT_REQUIRED',
          message: 'The free image provider is currently demanding payment or is unavailable for this request.',
        })
      }
      fastify.log.error(err, '[generate-image] failed to generate image')
      return reply.status(500).send({
        error: 'IMAGE_GENERATION_FAILED',
        message: 'Failed to generate image via AI model.',
      })
    }
  })
}
