import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { resolveGeminiApiKey } from './household-gemini-api-key'
import type { DbRecipeImageProvider } from './ai-settings'

// Available Google image-capable models on v1beta :generateContent or Imagen predict
const GOOGLE_IMAGE_MODELS = [
  'nano-banana-pro-preview',
  'gemini-nano-banana-2.1',
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite-image',
]
const GEMINI_GENERATE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const IMAGEN_MODELS = [
  'imagen-3.0-generate-002',
  'imagen-3.0-generate-001',
]

export interface GeneratedRecipeImageResult {
  path: string
  mimeType: string
  width: number
  height: number
  sizeBytes: number
}

export interface GenerateImageInput {
  title: string
  ingredients?: string[]
  description?: string
  instructions?: string[]
  promptOverride?: string
  householdGeminiApiKeyEncrypted: string | null
  imageProvider?: DbRecipeImageProvider
  uploadDir: string
}

export function buildFallbackPrompt(title: string, ingredients?: string[], description?: string): string {
  const cleanTitle = title.trim()
  const cleanIngredients = ingredients?.filter(Boolean).slice(0, 7).join(', ')

  let prompt = `Close-up gourmet food photography of freshly prepared ${cleanTitle}`
  if (cleanIngredients) {
    prompt += ` showcasing key ingredients: ${cleanIngredients}`
  }
  if (description && description.trim().length > 0) {
    prompt += `. ${description.trim().slice(0, 150)}`
  }
  prompt += `, artfully plated on modern ceramic dishware, natural kitchen lighting, professional culinary magazine style, 8k resolution, crisp focus, photorealistic`

  return prompt
}

async function synthesizeVisualPromptWithGemini(
  title: string,
  ingredients: string[] | undefined,
  instructions: string[] | undefined,
  description: string | undefined,
  apiKey: string
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  const systemInstruction = `You are a culinary food photographer and visual prompt engineer.
Given a recipe title, ingredients, and instructions, describe the final cooked dish visually for an AI text-to-image generator (Flux / Imagen).
Requirements:
1. Describe the finished, cooked, plated presentation (e.g. golden-brown crust, garnish, steaming, sauces, textures, colors, dishware, lighting).
2. ONLY focus on the visual appearance of the dish in English.
3. Keep it under 60 words.
4. Do NOT output markdown, quotes, prefixes, or explanations. Only return the prompt text.`

  const userContext = [
    `Recipe: ${title}`,
    ingredients && ingredients.length > 0 ? `Key ingredients: ${ingredients.slice(0, 10).join(', ')}` : '',
    instructions && instructions.length > 0 ? `Preparation summary: ${instructions.slice(0, 3).join('. ')}` : '',
    description ? `Description: ${description}` : '',
  ].filter(Boolean).join('\n')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userContext}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
    }),
  })

  if (!res.ok) {
    throw new Error(`Gemini prompt generation failed: HTTP ${res.status}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) {
    throw new Error('Empty Gemini prompt response')
  }

  return `Professional gourmet food photography, ${text}, highly appetizing, realistic textures, soft natural daylight, shallow depth of field, 4k`
}

async function tryGenerateWithPollinations(prompt: string, uploadDir: string): Promise<GeneratedRecipeImageResult> {
  const encodedPrompt = encodeURIComponent(prompt)
  // Pollinations currently requires payment/crypto headers (HTTP 402) for many models,
  // but models like sana/turbo or base endpoint can be attempted
  const models = ['sana', 'turbo', 'flux']
  let lastErr: any = null

  for (const model of models) {
    try {
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=1024&height=768&nologo=true`
      const res = await fetch(pollinationsUrl)
      if (!res.ok) {
        if (res.status === 402) {
          lastErr = new Error('FREE_PROVIDER_PAYMENT_REQUIRED')
        } else {
          lastErr = new Error(`Pollinations HTTP ${res.status} for model ${model}`)
        }
        continue
      }
      const arrayBuffer = await res.arrayBuffer()
      const imageBuffer = Buffer.from(arrayBuffer)

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const filename = `${crypto.randomUUID()}.webp`
      const filepath = path.join(uploadDir, filename)

      await sharp(imageBuffer)
        .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filepath)

      const stats = fs.statSync(filepath)
      const metadata = await sharp(filepath).metadata()

      return {
        path: `/uploads/${filename}`,
        mimeType: 'image/webp',
        width: metadata.width ?? 1024,
        height: metadata.height ?? 768,
        sizeBytes: stats.size,
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'FREE_PROVIDER_PAYMENT_REQUIRED') {
        lastErr = err
      } else {
        lastErr = err
      }
    }
  }

  throw lastErr || new Error('Pollinations image generation failed')
}

export async function generateRecipeImageWithImagen(input: GenerateImageInput): Promise<GeneratedRecipeImageResult> {
  const provider = input.imageProvider || 'NANO_BANANA'
  const resolved = resolveGeminiApiKey({ householdEncrypted: input.householdGeminiApiKeyEncrypted })

  let prompt = input.promptOverride?.trim() || ''

  if (!prompt) {
    if (resolved?.apiKey) {
      try {
        prompt = await synthesizeVisualPromptWithGemini(
          input.title,
          input.ingredients,
          input.instructions,
          input.description,
          resolved.apiKey
        )
      } catch {
        prompt = buildFallbackPrompt(input.title, input.ingredients, input.description)
      }
    } else {
      prompt = buildFallbackPrompt(input.title, input.ingredients, input.description)
    }
  }

  // If the user selected FREE_PROVIDER, generate directly with Pollinations (or other free provider)
  if (provider === 'FREE_PROVIDER') {
    return await tryGenerateWithPollinations(prompt, input.uploadDir)
  }

  // Otherwise, user selected Google (NANO_BANANA / Imagen)
  if (!resolved || !resolved.apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY')
  }

  let lastError = ''

  // 1. Try Google Nano Banana / Gemini image models using :generateContent
  for (const model of GOOGLE_IMAGE_MODELS) {
    const endpoint = `${GEMINI_GENERATE_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(resolved.apiKey)}`

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: {
                  mimeType?: string
                  data?: string
                }
              }>
            }
          }>
        }

        const candidateParts = data.candidates?.[0]?.content?.parts ?? []
        for (const part of candidateParts) {
          const base64Data = part.inlineData?.data
          if (base64Data) {
            const imageBuffer = Buffer.from(base64Data, 'base64')

            if (!fs.existsSync(input.uploadDir)) {
              fs.mkdirSync(input.uploadDir, { recursive: true })
            }

            const filename = `${crypto.randomUUID()}.webp`
            const filepath = path.join(input.uploadDir, filename)

            await sharp(imageBuffer)
              .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 85 })
              .toFile(filepath)

            const stats = fs.statSync(filepath)
            const metadata = await sharp(filepath).metadata()

            return {
              path: `/uploads/${filename}`,
              mimeType: 'image/webp',
              width: metadata.width ?? 1280,
              height: metadata.height ?? 960,
              sizeBytes: stats.size,
            }
          }
        }
      } else {
        const errorText = await response.text()
        lastError = `Google ${model} (${response.status}): ${errorText}`
        if (response.status === 429) {
          // If quota is 0 or exhausted, throw specific error for the caller to show clean notification
          throw new Error('GOOGLE_IMAGE_QUOTA_EXHAUSTED')
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'GOOGLE_IMAGE_QUOTA_EXHAUSTED') {
        throw err
      }
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  // 2. Try classic Imagen models using :predict as secondary Google fallback
  for (const model of IMAGEN_MODELS) {
    const endpoint = `${GEMINI_GENERATE_BASE_URL}/${model}:predict?key=${encodeURIComponent(resolved.apiKey)}`

    const requestBody = {
      instances: [
        {
          prompt,
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: '4:3',
        outputOptions: {
          mimeType: 'image/jpeg',
        },
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = (await response.json()) as {
          predictions?: Array<{
            bytesBase64Encoded?: string
          }>
        }

        const base64Data = data.predictions?.[0]?.bytesBase64Encoded
        if (base64Data) {
          const imageBuffer = Buffer.from(base64Data, 'base64')

          if (!fs.existsSync(input.uploadDir)) {
            fs.mkdirSync(input.uploadDir, { recursive: true })
          }

          const filename = `${crypto.randomUUID()}.webp`
          const filepath = path.join(input.uploadDir, filename)

          await sharp(imageBuffer)
            .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(filepath)

          const stats = fs.statSync(filepath)
          const metadata = await sharp(filepath).metadata()

          return {
            path: `/uploads/${filename}`,
            mimeType: 'image/webp',
            width: metadata.width ?? 1280,
            height: metadata.height ?? 960,
            sizeBytes: stats.size,
          }
        }
      } else {
        lastError = await response.text()
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  // If Google Imagen is not available for this API key / tier, fallback gracefully to Pollinations.ai
  try {
    return await tryGenerateWithPollinations(prompt, input.uploadDir)
  } catch (fallbackErr) {
    throw new Error(`Imagen API error: ${lastError}; fallback also failed: ${fallbackErr}`)
  }
}
