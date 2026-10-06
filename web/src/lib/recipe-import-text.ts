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
import { callGeminiJson, mapRecipeExtractionModelToGeminiModel } from '@/lib/recipe-import-web-url'

const MAX_IMPORT_TEXT_LENGTH = 30_000

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
}

export interface ImportRecipeFromTextInput {
  householdId: string
  importText: string
  model: RecipeExtractionModel
  householdGeminiApiKeyEncrypted: string | null
}

interface ImportDeps {
  fetchImpl?: typeof fetch
}

function clampText(value: string, maxLen: number): string {
  return value.length <= maxLen ? value : value.slice(0, maxLen)
}

function parseInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return rounded > 0 ? rounded : null
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

function sanitizeAiRecipeExtraction(raw: unknown): AiRecipeExtraction {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const titleCandidate = typeof data.title === 'string' ? data.title.trim() : ''

  return {
    title: clampText(titleCandidate || 'Imported recipe', MAX_TITLE_LENGTH),
    servings: parseInteger(data.servings),
    prepMinutes: parseInteger(data.prepMinutes),
    cookMinutes: parseInteger(data.cookMinutes),
    instructions: sanitizeAiInstructionRows(data.instructions),
    ingredientRows: sanitizeAiIngredientRows(data.ingredientRows),
  }
}

function buildExtractionPrompt(importText: string): string {
  return [
    'Extract one recipe from this text.',
    'Return ONLY strict JSON matching this exact shape:',
    '{"title":string,"servings":number|null,"prepMinutes":number|null,"cookMinutes":number|null,"instructions":[{"kind":"heading"|"item","text":string}],"ingredientRows":[{"kind":"heading"|"item","heading"?:string,"name"?:string,"quantity"?:string,"unit"?:string,"note"?:string}]}',
    'Rules:',
    '- Use only information from the provided text.',
    '- title required, concise, no markdown.',
    '- instructions and ingredientRows should preserve recipe structure and order.',
    '- ingredientRows item rows must include name.',
    '- servings/prepMinutes/cookMinutes should be integers or null.',
    '',
    'recipeText:',
    importText,
  ].join('\n')
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

async function persistImportedRecipe(input: ImportRecipeFromTextInput, extracted: AiRecipeExtraction): Promise<string> {
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
        sourceUrl: null,
        instructions: extracted.instructions as unknown as Prisma.InputJsonValue,
        draftSavedAt: now,
        lastAutosavedAt: now,
        imagePath: null,
        imageMimeType: null,
        imageWidth: null,
        imageHeight: null,
        imageSizeBytes: null,
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

export function validateImportText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_IMPORT_TEXT_LENGTH) return null
  return trimmed
}

export async function importRecipeFromText(input: ImportRecipeFromTextInput, deps?: ImportDeps): Promise<{ recipeId: string }> {
  const importText = validateImportText(input.importText)
  if (!importText) {
    throw new Error('Invalid import text.')
  }

  const fetchImpl = deps?.fetchImpl ?? fetch
  const model = mapRecipeExtractionModelToGeminiModel(input.model)
  const extractionPrompt = buildExtractionPrompt(importText)

  const aiRaw = await callGeminiJson<unknown>(
    model,
    extractionPrompt,
    fetchImpl,
    input.householdGeminiApiKeyEncrypted
  )
  const extracted = sanitizeAiRecipeExtraction(aiRaw)
  const recipeId = await persistImportedRecipe(input, extracted)

  return { recipeId }
}
