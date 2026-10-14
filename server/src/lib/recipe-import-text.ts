import { query, withTransaction } from '../db'
import { generateId } from './auth'
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
} from './recipe-domain'
import { callGeminiJson, mapRecipeExtractionModelToGeminiModel, type RecipeExtractionModel } from './recipe-import-web-url'

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

async function resolveIngredientId(client: { query: typeof query }, householdId: string, name: string): Promise<string> {
  const normalized = normalizeLower(name)
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM "Ingredient" WHERE "householdId" = $1 AND "nameNormalized" = $2`,
    [householdId, normalized]
  )
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE "Ingredient" SET name = $1, "updatedAt" = NOW() WHERE id = $2`,
      [name, existing.rows[0].id]
    )
    return existing.rows[0].id
  }
  const created = await client.query<{ id: string }>(
    `INSERT INTO "Ingredient" ("id", "householdId", name, "nameNormalized", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
    [generateId('ing'), householdId, name, normalized]
  )
  return created.rows[0].id
}

async function resolveUnitId(
  client: { query: typeof query },
  householdId: string,
  maybeUnitName: string | undefined
): Promise<string | null> {
  const unitName = maybeUnitName?.trim()
  if (!unitName) return null

  const normalized = normalizeLower(unitName)
  const clamped = clampText(unitName, MAX_UNIT_NAME_LENGTH)
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM "Unit" WHERE "householdId" = $1 AND "nameNormalized" = $2`,
    [householdId, normalized]
  )
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE "Unit" SET name = $1, "updatedAt" = NOW() WHERE id = $2`,
      [clamped, existing.rows[0].id]
    )
    return existing.rows[0].id
  }
  const created = await client.query<{ id: string }>(
    `INSERT INTO "Unit" ("id", "householdId", name, "nameNormalized", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
    [generateId('un'), householdId, clamped, normalized]
  )
  return created.rows[0].id
}

async function persistImportedRecipe(input: ImportRecipeFromTextInput, extracted: AiRecipeExtraction): Promise<string> {
  return withTransaction(async (client) => {
    const id = generateId('rc')
    const recipeRes = await client.query<{ id: string }>(
      `INSERT INTO "Recipe" (
        "id", "householdId", title, status, servings, "prepMinutes", "cookMinutes",
        instructions, "draftSavedAt", "lastAutosavedAt", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6, $7, NOW(), NOW(), NOW(), NOW())
      RETURNING id`,
      [
        id,
        input.householdId,
        clampText(extracted.title, MAX_TITLE_LENGTH),
        extracted.servings,
        extracted.prepMinutes,
        extracted.cookMinutes,
        JSON.stringify(extracted.instructions),
      ]
    )
    const recipeId = recipeRes.rows[0].id

    let position = 0
    for (const row of extracted.ingredientRows) {
      if (row.kind === 'heading') {
        await client.query(
          `INSERT INTO "RecipeIngredientRow" (
            "id", "recipeId", position, kind, heading, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, 'HEADING', $4, NOW(), NOW())`,
          [generateId('row'), recipeId, position++, row.heading ? clampText(row.heading, MAX_INGREDIENT_HEADING_LENGTH) : null]
        )
        continue
      }

      const ingredientName = row.name?.trim()
      if (!ingredientName) continue

      const ingredientId = await resolveIngredientId(client, input.householdId, clampText(ingredientName, MAX_INGREDIENT_NAME_LENGTH))
      const unitId = await resolveUnitId(client, input.householdId, row.unit)

      await client.query(
        `INSERT INTO "RecipeIngredientRow" (
          "id", "recipeId", position, kind, "ingredientId", quantity, "unitId", note, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, 'ITEM', $4, $5, $6, $7, NOW(), NOW())`,
        [
          generateId('row'),
          recipeId,
          position++,
          ingredientId,
          row.quantity ? clampText(row.quantity, MAX_QUANTITY_LENGTH) : null,
          unitId,
          row.note ? clampText(row.note, MAX_INGREDIENT_NOTE_LENGTH) : null,
        ]
      )
    }

    return recipeId
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
