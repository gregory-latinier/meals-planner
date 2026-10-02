import { Prisma, RecipeExtractionModel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  MAX_INGREDIENT_HEADING_LENGTH,
  MAX_INGREDIENT_NAME_LENGTH,
  MAX_INGREDIENT_NOTE_LENGTH,
  MAX_INSTRUCTION_HEADING_LENGTH,
  MAX_INSTRUCTION_ITEM_LENGTH,
  MAX_QUANTITY_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UNIT_NAME_LENGTH,
  normalizeLower,
} from '@/lib/recipe-domain'
import { downloadImageBuffer, processAndStoreRecipeImage, type StoredRecipeImage } from '@/lib/recipe-image'
import { assertSafeRemoteHttpUrl } from '@/lib/remote-url-safety'
import { resolveGeminiApiKey } from '@/lib/household-gemini-api-key'

const MAX_HTML_BYTES = 2 * 1024 * 1024
const HTML_FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5

interface ParsedJsonLdRecipe {
  name?: unknown
  description?: unknown
  recipeYield?: unknown
  prepTime?: unknown
  cookTime?: unknown
  image?: unknown
  recipeIngredient?: unknown
  recipeInstructions?: unknown
  keywords?: unknown
}

interface ExtractedContext {
  pageTitle: string | null
  metaDescription: string | null
  jsonLdRecipe: ParsedJsonLdRecipe | null
  mainTextSnippet: string
  imageCandidates: string[]
}

interface AiInstructionRow {
  kind: 'heading' | 'item'
  text: string
}

interface AiIngredientRow {
  kind: 'heading' | 'item'
  heading?: string
  name?: string
  quantity?: string
  unit?: string
  note?: string
}

interface AiRecipeExtraction {
  title: string
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  instructions: AiInstructionRow[]
  ingredientRows: AiIngredientRow[]
  selectedImageUrl: string | null
}

export interface ImportRecipeFromWebUrlInput {
  householdId: string
  sourceUrl: string
  model: RecipeExtractionModel
  householdGeminiApiKeyEncrypted: string | null
}

export interface ImportRecipeFromWebUrlResult {
  recipeId: string
  imageImportWarning: string | null
}

interface ImportDeps {
  fetchImpl?: typeof fetch
}

export { assertSafeRemoteHttpUrl }

function clampText(value: string, maxLen: number): string {
  return value.length <= maxLen ? value : value.slice(0, maxLen)
}

function parseInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return rounded > 0 ? rounded : null
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function toAbsoluteUrl(candidate: string, baseUrl: string): string | null {
  try {
    const url = new URL(candidate, baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function extractMetaContent(html: string, key: string, attr: 'name' | 'property'): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<meta[^>]*${attr}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')
  const match = html.match(re)
  if (!match || !match[1]) return null
  return decodeHtmlEntities(match[1].trim()) || null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match || !match[1]) return null
  const cleaned = decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim())
  return cleaned || null
}

function stripHtmlToText(html: string): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const withoutTags = withoutStyles.replace(/<[^>]+>/g, ' ')
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, ' ').trim()
}

function flattenJsonLdRecipes(node: unknown): ParsedJsonLdRecipe[] {
  if (!node) return []
  if (Array.isArray(node)) {
    return node.flatMap((entry) => flattenJsonLdRecipes(entry))
  }
  if (typeof node !== 'object') return []

  const obj = node as Record<string, unknown>
  if ('@graph' in obj) {
    return flattenJsonLdRecipes(obj['@graph'])
  }

  const typeValue = obj['@type']
  const types = Array.isArray(typeValue) ? typeValue : [typeValue]
  const hasRecipeType = types.some((entry) => typeof entry === 'string' && entry.toLocaleLowerCase().includes('recipe'))

  return hasRecipeType ? [obj as ParsedJsonLdRecipe] : []
}

function extractJsonLdRecipes(html: string): ParsedJsonLdRecipe[] {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const recipes: ParsedJsonLdRecipe[] = []

  for (const scriptMatch of scripts) {
    const raw = scriptMatch[1]?.trim()
    if (!raw) continue
    const parsed = safeJsonParse(decodeHtmlEntities(raw))
    recipes.push(...flattenJsonLdRecipes(parsed))
  }

  return recipes
}

function collectImageUrlsFromJsonLdImage(image: unknown, sourceUrl: string): string[] {
  if (!image) return []
  if (typeof image === 'string') {
    const resolved = toAbsoluteUrl(image, sourceUrl)
    return resolved ? [resolved] : []
  }
  if (Array.isArray(image)) {
    return image.flatMap((entry) => collectImageUrlsFromJsonLdImage(entry, sourceUrl))
  }
  if (typeof image === 'object' && image !== null) {
    const url = (image as { url?: unknown }).url
    if (typeof url === 'string') {
      const resolved = toAbsoluteUrl(url, sourceUrl)
      return resolved ? [resolved] : []
    }
  }
  return []
}

function collectImageCandidates(html: string, sourceUrl: string, jsonLdRecipe: ParsedJsonLdRecipe | null): string[] {
  const candidates: string[] = []

  const ogImage = extractMetaContent(html, 'og:image', 'property')
  const twitterImage = extractMetaContent(html, 'twitter:image', 'name')
  if (ogImage) {
    const resolved = toAbsoluteUrl(ogImage, sourceUrl)
    if (resolved) candidates.push(resolved)
  }
  if (twitterImage) {
    const resolved = toAbsoluteUrl(twitterImage, sourceUrl)
    if (resolved) candidates.push(resolved)
  }

  if (jsonLdRecipe?.image) {
    candidates.push(...collectImageUrlsFromJsonLdImage(jsonLdRecipe.image, sourceUrl))
  }

  const imgMatches = [...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)]
  for (const match of imgMatches) {
    const src = match[1]?.trim()
    if (!src) continue
    const resolved = toAbsoluteUrl(src, sourceUrl)
    if (resolved) candidates.push(resolved)
    if (candidates.length >= 60) break
  }

  const unique: string[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (!seen.has(candidate)) {
      seen.add(candidate)
      unique.push(candidate)
    }
  }
  return unique.slice(0, 30)
}

function parseIsoDurationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!match) return null
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0
  const mins = match[2] ? Number.parseInt(match[2], 10) : 0
  const total = hours * 60 + mins
  return total > 0 ? total : null
}

function parseServings(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }

  if (typeof value === 'string') {
    const match = value.match(/\d+/)
    if (!match) return null
    const parsed = Number.parseInt(match[0], 10)
    return parsed > 0 ? parsed : null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseServings(entry)
      if (parsed) return parsed
    }
  }

  return null
}

function pickMainJsonLdRecipe(recipes: ParsedJsonLdRecipe[]): ParsedJsonLdRecipe | null {
  if (recipes.length === 0) return null
  const withIngredients = recipes.find(
    (entry) => Array.isArray(entry.recipeIngredient) && entry.recipeIngredient.length > 0
  )
  return withIngredients ?? recipes[0]
}

async function fetchHtml(sourceUrl: string, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HTML_FETCH_TIMEOUT_MS)

  try {
    let currentUrl = await assertSafeRemoteHttpUrl(sourceUrl)
    let response: Response | null = null

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      response = await fetchImpl(currentUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
        signal: controller.signal,
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          throw new Error('Could not fetch source page.')
        }

        const redirectUrl = new URL(location, currentUrl).toString()
        currentUrl = await assertSafeRemoteHttpUrl(redirectUrl)
        continue
      }

      break
    }

    if (!response) {
      throw new Error('Could not fetch source page.')
    }

    if (response.status >= 300 && response.status < 400) {
      throw new Error('Could not fetch source page.')
    }

    if (!response.ok) {
      throw new Error('Could not fetch source page.')
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.toLocaleLowerCase().includes('text/html')) {
      throw new Error('Source URL did not return an HTML page.')
    }

    const contentLengthHeader = response.headers.get('content-length')
    if (contentLengthHeader) {
      const length = Number.parseInt(contentLengthHeader, 10)
      if (Number.isFinite(length) && length > MAX_HTML_BYTES) {
        throw new Error('Source page is too large.')
      }
    }

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_HTML_BYTES) {
      throw new Error('Source page is too large.')
    }

    return Buffer.from(arrayBuffer).toString('utf8')
  } finally {
    clearTimeout(timeout)
  }
}

function extractContextFromHtml(html: string, sourceUrl: string): ExtractedContext {
  const jsonLdRecipes = extractJsonLdRecipes(html)
  const jsonLdRecipe = pickMainJsonLdRecipe(jsonLdRecipes)
  const pageTitle = extractMetaContent(html, 'og:title', 'property') ?? extractTitle(html)
  const metaDescription =
    extractMetaContent(html, 'description', 'name') ?? extractMetaContent(html, 'og:description', 'property')
  const mainTextSnippet = clampText(stripHtmlToText(html), 10_000)
  const imageCandidates = collectImageCandidates(html, sourceUrl, jsonLdRecipe)

  return {
    pageTitle,
    metaDescription,
    jsonLdRecipe,
    mainTextSnippet,
    imageCandidates,
  }
}

const GEMINI_GENERATE_CONTENT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const GEMINI_MODEL_BY_RECIPE_EXTRACTION_MODEL: Record<RecipeExtractionModel, string> = {
  // Centralized mapping so model upgrades are a one-line change.
  GEMINI_FREE: 'gemini-2.5-flash',
}

export const MISSING_GEMINI_API_KEY_ERROR =
  'Missing Gemini API key. Configure one in Settings or set GEMINI_API_KEY/GOOGLE_API_KEY.'

function mapDbModelToGeminiModel(model: RecipeExtractionModel): string {
  return GEMINI_MODEL_BY_RECIPE_EXTRACTION_MODEL[model]
}

function buildGeminiGenerateContentEndpoint(model: string): string {
  return `${GEMINI_GENERATE_CONTENT_BASE_URL}/${model}:generateContent`
}

function getGeminiApiKey(householdGeminiApiKeyEncrypted: string | null): string {
  const resolved = resolveGeminiApiKey({ householdEncrypted: householdGeminiApiKeyEncrypted })
  if (!resolved) {
    throw new Error(MISSING_GEMINI_API_KEY_ERROR)
  }
  return resolved.apiKey
}

function extractJsonFromModelText(text: string): unknown {
  const direct = safeJsonParse(text)
  if (direct) return direct

  const trimmed = text.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    const parsed = safeJsonParse(fencedMatch[1])
    if (parsed) return parsed
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return safeJsonParse(trimmed.slice(firstBrace, lastBrace + 1))
  }

  return null
}

export async function callGeminiJson<T>(
  model: string,
  prompt: string,
  fetchImpl: typeof fetch,
  householdGeminiApiKeyEncrypted: string | null
): Promise<T> {
  const apiKey = getGeminiApiKey(householdGeminiApiKeyEncrypted)
  const endpoint = buildGeminiGenerateContentEndpoint(model)

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok) {
    throw new Error('AI extraction failed.')
  }

  const body = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const candidateTexts = (body.candidates ?? [])
    .map((candidate) => candidate.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '')
    .filter((text) => text.length > 0)

  if (candidateTexts.length === 0) {
    throw new Error('AI extraction failed.')
  }

  for (const text of candidateTexts) {
    const parsed = extractJsonFromModelText(text)
    if (parsed) {
      return parsed as T
    }
  }

  throw new Error('AI extraction failed.')
}

function sanitizeAiInstructionRows(value: unknown): AiInstructionRow[] {
  if (!Array.isArray(value)) return []

  const rows: AiInstructionRow[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue
    const candidate = row as { kind?: unknown; text?: unknown }
    const kind = candidate.kind === 'heading' ? 'heading' : 'item'
    const text = typeof candidate.text === 'string' ? candidate.text.trim() : ''
    if (!text) continue

    rows.push({
      kind,
      text: clampText(text, kind === 'heading' ? MAX_INSTRUCTION_HEADING_LENGTH : MAX_INSTRUCTION_ITEM_LENGTH),
    })
  }
  return rows
}

function sanitizeAiIngredientRows(value: unknown): AiIngredientRow[] {
  if (!Array.isArray(value)) return []

  const rows: AiIngredientRow[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue
    const candidate = row as {
      kind?: unknown
      heading?: unknown
      name?: unknown
      quantity?: unknown
      unit?: unknown
      note?: unknown
    }

    const kind = candidate.kind === 'heading' ? 'heading' : 'item'
    if (kind === 'heading') {
      const heading = typeof candidate.heading === 'string' ? candidate.heading.trim() : ''
      if (!heading) continue
      rows.push({ kind: 'heading', heading: clampText(heading, MAX_INGREDIENT_HEADING_LENGTH) })
      continue
    }

    const name = typeof candidate.name === 'string' ? candidate.name.trim() : ''
    if (!name) continue

    const quantity = typeof candidate.quantity === 'string' ? candidate.quantity.trim() : ''
    const unit = typeof candidate.unit === 'string' ? candidate.unit.trim() : ''
    const note = typeof candidate.note === 'string' ? candidate.note.trim() : ''

    rows.push({
      kind: 'item',
      name: clampText(name, MAX_INGREDIENT_NAME_LENGTH),
      quantity: quantity ? clampText(quantity, MAX_QUANTITY_LENGTH) : undefined,
      unit: unit ? clampText(unit, MAX_UNIT_NAME_LENGTH) : undefined,
      note: note ? clampText(note, MAX_INGREDIENT_NOTE_LENGTH) : undefined,
    })
  }

  return rows
}

function fallbackTitle(context: ExtractedContext, sourceUrl: string): string {
  if (context.pageTitle) return clampText(context.pageTitle, MAX_TITLE_LENGTH)

  try {
    const url = new URL(sourceUrl)
    return clampText(url.hostname, MAX_TITLE_LENGTH)
  } catch {
    return 'Imported recipe'
  }
}

function sanitizeAiRecipeExtraction(raw: unknown, context: ExtractedContext, sourceUrl: string): AiRecipeExtraction {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  const titleCandidate = typeof data.title === 'string' ? data.title.trim() : ''

  return {
    title: clampText(titleCandidate || fallbackTitle(context, sourceUrl), MAX_TITLE_LENGTH),
    servings: parseInteger(data.servings),
    prepMinutes: parseInteger(data.prepMinutes),
    cookMinutes: parseInteger(data.cookMinutes),
    instructions: sanitizeAiInstructionRows(data.instructions),
    ingredientRows: sanitizeAiIngredientRows(data.ingredientRows),
    selectedImageUrl: typeof data.selectedImageUrl === 'string' ? data.selectedImageUrl.trim() : null,
  }
}

function buildExtractionPrompt(sourceUrl: string, context: ExtractedContext): string {
  const recipe = context.jsonLdRecipe

  return [
    'Extract one recipe from this webpage context.',
    'Return ONLY strict JSON matching this exact shape:',
    '{"title":string,"servings":number|null,"prepMinutes":number|null,"cookMinutes":number|null,"instructions":[{"kind":"heading"|"item","text":string}],"ingredientRows":[{"kind":"heading"|"item","heading"?:string,"name"?:string,"quantity"?:string,"unit"?:string,"note"?:string}],"selectedImageUrl":string|null}',
    'Rules:',
    '- Use only information from the page context.',
    '- title required, concise, no markdown.',
    '- instructions and ingredientRows should preserve recipe structure and order.',
    '- ingredientRows item rows must include name.',
    '- servings/prepMinutes/cookMinutes should be integers or null.',
    '- selectedImageUrl must be one value from imageCandidates list, or null.',
    '',
    `sourceUrl: ${sourceUrl}`,
    `pageTitle: ${context.pageTitle ?? ''}`,
    `metaDescription: ${context.metaDescription ?? ''}`,
    `jsonLdRecipeName: ${typeof recipe?.name === 'string' ? recipe.name : ''}`,
    `jsonLdRecipeYield: ${JSON.stringify(recipe?.recipeYield ?? null)}`,
    `jsonLdPrepTime: ${JSON.stringify(recipe?.prepTime ?? null)}`,
    `jsonLdCookTime: ${JSON.stringify(recipe?.cookTime ?? null)}`,
    `jsonLdIngredients: ${JSON.stringify(Array.isArray(recipe?.recipeIngredient) ? recipe?.recipeIngredient : [])}`,
    `jsonLdInstructions: ${JSON.stringify(recipe?.recipeInstructions ?? null)}`,
    `jsonLdKeywords: ${JSON.stringify(recipe?.keywords ?? null)}`,
    `mainTextSnippet: ${context.mainTextSnippet}`,
    `imageCandidates: ${JSON.stringify(context.imageCandidates)}`,
  ].join('\n')
}

function normalizeAiImageSelection(
  selectedImageUrl: string | null,
  candidates: string[]
): { orderedCandidates: string[] } {
  if (candidates.length === 0) {
    return { orderedCandidates: [] }
  }

  if (!selectedImageUrl) {
    return { orderedCandidates: candidates }
  }

  const selected = candidates.find((candidate) => candidate === selectedImageUrl)
  if (!selected) {
    return { orderedCandidates: candidates }
  }

  return {
    orderedCandidates: [selected, ...candidates.filter((candidate) => candidate !== selected)],
  }
}

export async function pickBestImageWithFallback(
  orderedCandidates: string[],
  deps?: {
    download?: (url: string) => Promise<Buffer>
    store?: (input: Buffer) => Promise<StoredRecipeImage>
  }
): Promise<{ image: StoredRecipeImage | null; warning: string | null }> {
  if (orderedCandidates.length === 0) {
    return { image: null, warning: null }
  }

  const download = deps?.download ?? downloadImageBuffer
  const store = deps?.store ?? processAndStoreRecipeImage

  for (const imageUrl of orderedCandidates) {
    try {
      const buffer = await download(imageUrl)
      const stored = await store(buffer)
      return { image: stored, warning: null }
    } catch {
      // continue and try next candidate
    }
  }

  return {
    image: null,
    warning: 'Recipe imported, but image could not be imported.',
  }
}

async function enrichFromJsonLdFallback(
  extracted: AiRecipeExtraction,
  context: ExtractedContext
): Promise<AiRecipeExtraction> {
  const recipe = context.jsonLdRecipe
  if (!recipe) return extracted

  const instructions = extracted.instructions.length > 0
    ? extracted.instructions
    : (() => {
      const raw = recipe.recipeInstructions
      if (!Array.isArray(raw)) return extracted.instructions
      const rows: AiInstructionRow[] = []
      for (const entry of raw) {
        if (typeof entry === 'string' && entry.trim()) {
          rows.push({ kind: 'item', text: clampText(entry.trim(), MAX_INSTRUCTION_ITEM_LENGTH) })
          continue
        }
        if (typeof entry === 'object' && entry !== null) {
          const text = (entry as { text?: unknown; name?: unknown }).text
          const name = (entry as { text?: unknown; name?: unknown }).name
          const fromEntry =
            typeof text === 'string' && text.trim()
              ? text.trim()
              : typeof name === 'string' && name.trim()
                ? name.trim()
                : ''
          if (fromEntry) {
            rows.push({ kind: 'item', text: clampText(fromEntry, MAX_INSTRUCTION_ITEM_LENGTH) })
          }
        }
      }
      return rows
    })()

  const ingredientRows = extracted.ingredientRows.length > 0
    ? extracted.ingredientRows
    : (() => {
      const raw = recipe.recipeIngredient
      if (!Array.isArray(raw)) return extracted.ingredientRows
      return raw
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => ({ kind: 'item' as const, name: clampText(entry.trim(), MAX_INGREDIENT_NAME_LENGTH) }))
    })()

  const servings = extracted.servings ?? parseServings(recipe.recipeYield)
  const prepMinutes = extracted.prepMinutes ?? parseIsoDurationMinutes(recipe.prepTime)
  const cookMinutes = extracted.cookMinutes ?? parseIsoDurationMinutes(recipe.cookTime)

  return {
    ...extracted,
    instructions,
    ingredientRows,
    servings,
    prepMinutes,
    cookMinutes,
  }
}

async function resolveIngredientId(tx: Prisma.TransactionClient, householdId: string, name: string): Promise<string> {
  const normalized = normalizeLower(name)
  const ingredient = await tx.ingredient.upsert({
    where: {
      householdId_nameNormalized: {
        householdId,
        nameNormalized: normalized,
      },
    },
    create: {
      householdId,
      name,
      nameNormalized: normalized,
    },
    update: {
      name,
    },
    select: {
      id: true,
    },
  })

  return ingredient.id
}

async function resolveUnitId(
  tx: Prisma.TransactionClient,
  householdId: string,
  maybeUnitName: string | undefined
): Promise<string | null> {
  const unitName = maybeUnitName?.trim()
  if (!unitName) return null

  const normalized = normalizeLower(unitName)
  const unit = await tx.unit.upsert({
    where: {
      householdId_nameNormalized: {
        householdId,
        nameNormalized: normalized,
      },
    },
    create: {
      householdId,
      name: clampText(unitName, MAX_UNIT_NAME_LENGTH),
      nameNormalized: normalized,
    },
    update: {
      name: clampText(unitName, MAX_UNIT_NAME_LENGTH),
    },
    select: {
      id: true,
    },
  })

  return unit.id
}

async function persistImportedRecipe(
  input: ImportRecipeFromWebUrlInput,
  extracted: AiRecipeExtraction,
  image: StoredRecipeImage | null
): Promise<string> {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const ingredientRowsPayload: Array<{
      position: number
      kind: 'HEADING' | 'ITEM'
      heading: string | null
      ingredientId: string | null
      quantity: string | null
      unitId: string | null
      note: string | null
    }> = []

    for (const row of extracted.ingredientRows) {
      if (row.kind === 'heading') {
        ingredientRowsPayload.push({
          position: ingredientRowsPayload.length,
          kind: 'HEADING',
          heading: row.heading ? clampText(row.heading, MAX_INGREDIENT_HEADING_LENGTH) : null,
          ingredientId: null,
          quantity: null,
          unitId: null,
          note: null,
        })
        continue
      }

      const ingredientName = row.name?.trim()
      if (!ingredientName) continue

      const ingredientId = await resolveIngredientId(tx, input.householdId, clampText(ingredientName, MAX_INGREDIENT_NAME_LENGTH))
      const unitId = await resolveUnitId(tx, input.householdId, row.unit)

      ingredientRowsPayload.push({
        position: ingredientRowsPayload.length,
        kind: 'ITEM',
        heading: null,
        ingredientId,
        quantity: row.quantity ? clampText(row.quantity, MAX_QUANTITY_LENGTH) : null,
        unitId,
        note: row.note ? clampText(row.note, MAX_INGREDIENT_NOTE_LENGTH) : null,
      })
    }

    const recipe = await tx.recipe.create({
      data: {
        householdId: input.householdId,
        title: clampText(extracted.title, MAX_TITLE_LENGTH),
        status: 'DRAFT',
        servings: extracted.servings,
        prepMinutes: extracted.prepMinutes,
        cookMinutes: extracted.cookMinutes,
        sourceUrl: input.sourceUrl,
        instructions: extracted.instructions as unknown as Prisma.InputJsonValue,
        draftSavedAt: now,
        lastAutosavedAt: now,
        imagePath: image?.path ?? null,
        imageMimeType: image?.mimeType ?? null,
        imageWidth: image?.width ?? null,
        imageHeight: image?.height ?? null,
        imageSizeBytes: image?.sizeBytes ?? null,
        ingredientRows: {
          create: ingredientRowsPayload,
        },
      },
      select: {
        id: true,
      },
    })

    return recipe.id
  })
}

export async function importRecipeFromWebUrl(
  input: ImportRecipeFromWebUrlInput,
  deps?: ImportDeps
): Promise<ImportRecipeFromWebUrlResult> {
  const fetchImpl = deps?.fetchImpl ?? fetch
  const safeSourceUrl = await assertSafeRemoteHttpUrl(input.sourceUrl)
  const html = await fetchHtml(safeSourceUrl, fetchImpl)
  const context = extractContextFromHtml(html, safeSourceUrl)
  const model = mapDbModelToGeminiModel(input.model)

  const extractionPrompt = buildExtractionPrompt(safeSourceUrl, context)
  const aiRaw = await callGeminiJson<unknown>(
    model,
    extractionPrompt,
    fetchImpl,
    input.householdGeminiApiKeyEncrypted
  )
  const sanitized = sanitizeAiRecipeExtraction(aiRaw, context, safeSourceUrl)
  const enriched = await enrichFromJsonLdFallback(sanitized, context)

  const { orderedCandidates } = normalizeAiImageSelection(
    enriched.selectedImageUrl,
    context.imageCandidates
  )

  const { image, warning } = await pickBestImageWithFallback(orderedCandidates)
    const recipeId = await persistImportedRecipe(input, enriched, image)

  return {
    recipeId,
    imageImportWarning: warning,
  }
}
