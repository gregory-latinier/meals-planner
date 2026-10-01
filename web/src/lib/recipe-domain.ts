import type { Prisma, RecipeIngredientRowKind, RecipeStatus } from '@prisma/client'

export const MAX_TITLE_LENGTH = 500
export const MAX_TAG_LENGTH = 100
export const MAX_INGREDIENT_NAME_LENGTH = 300
export const MAX_UNIT_NAME_LENGTH = 100
export const MAX_INGREDIENT_HEADING_LENGTH = 500
export const MAX_INGREDIENT_NOTE_LENGTH = 500
export const MAX_QUANTITY_LENGTH = 100
export const MAX_INSTRUCTION_HEADING_LENGTH = 500
export const MAX_INSTRUCTION_ITEM_LENGTH = 10_000

export interface InstructionRowInput {
  kind: 'heading' | 'item'
  text: string
}

export interface IngredientRowInput {
  kind: 'heading' | 'item'
  heading?: string
  ingredientId?: string
  quantity?: string
  unitId?: string
  note?: string
}

export interface ParsedRecipePayload {
  title: string
  cookbookId: string | null
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  sourceUrl: string | null
  instructions: InstructionRowInput[]
  ingredientRows: IngredientRowInput[]
  tagNames: string[]
  imagePath: string | null
  imageMimeType: string | null
  imageWidth: number | null
  imageHeight: number | null
  imageSizeBytes: number | null
}

export const CUID_REGEX = /^c[a-z0-9]{24}$/

export function isValidCuid(value: string): boolean {
  return CUID_REGEX.test(value)
}

export function normalizeLower(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function parseOptionalInt(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`)
  }
  return value
}

function parseOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseInstructions(value: unknown, opts?: { allowEmptyText?: boolean }): InstructionRowInput[] {
  if (!Array.isArray(value)) {
    throw new Error('Instructions must be an array.')
  }

  return value.map((row, index) => {
    if (typeof row !== 'object' || row === null) {
      throw new Error(`Instruction row ${index + 1} is invalid.`)
    }

    const candidate = row as { kind?: unknown; text?: unknown }
    const kind = candidate.kind === 'heading' ? 'heading' : candidate.kind === 'item' ? 'item' : null
    const text = typeof candidate.text === 'string' ? candidate.text.trim() : ''

    if (!kind) {
      throw new Error(`Instruction row ${index + 1} has an invalid kind.`)
    }

    if (!text && !opts?.allowEmptyText) {
      throw new Error(`Instruction row ${index + 1} cannot be empty.`)
    }

    if (!text && opts?.allowEmptyText) {
      return { kind, text: '' }
    }

    if (kind === 'item' && text.length > MAX_INSTRUCTION_ITEM_LENGTH) {
      throw new Error(`Instruction items must be ${MAX_INSTRUCTION_ITEM_LENGTH} characters or fewer.`)
    }

    if (kind === 'heading' && text.length > MAX_INSTRUCTION_HEADING_LENGTH) {
      throw new Error(`Instruction headings must be ${MAX_INSTRUCTION_HEADING_LENGTH} characters or fewer.`)
    }

    return { kind, text }
  })
}

function parseIngredientRows(value: unknown, opts?: { allowIncompleteItems?: boolean }): IngredientRowInput[] {
  if (!Array.isArray(value)) {
    throw new Error('Ingredient rows must be an array.')
  }

  return value.map((row, index) => {
    if (typeof row !== 'object' || row === null) {
      throw new Error(`Ingredient row ${index + 1} is invalid.`)
    }

    const candidate = row as {
      kind?: unknown
      heading?: unknown
      ingredientId?: unknown
      quantity?: unknown
      unitId?: unknown
      note?: unknown
    }

    const kind = candidate.kind === 'heading' ? 'heading' : candidate.kind === 'item' ? 'item' : null
    if (!kind) {
      throw new Error(`Ingredient row ${index + 1} has an invalid kind.`)
    }

    if (kind === 'heading') {
      const heading = typeof candidate.heading === 'string' ? candidate.heading.trim() : ''
      if (!heading && !opts?.allowIncompleteItems) {
        throw new Error(`Ingredient heading row ${index + 1} requires heading text.`)
      }
      if (!heading && opts?.allowIncompleteItems) {
        return { kind, heading: '' }
      }
      if (heading.length > MAX_INGREDIENT_HEADING_LENGTH) {
        throw new Error(`Ingredient headings must be ${MAX_INGREDIENT_HEADING_LENGTH} characters or fewer.`)
      }

      return { kind, heading }
    }

    const ingredientId = typeof candidate.ingredientId === 'string' ? candidate.ingredientId.trim() : ''
    if ((!ingredientId || !isValidCuid(ingredientId)) && !opts?.allowIncompleteItems) {
      throw new Error(`Ingredient item row ${index + 1} requires a valid ingredient.`)
    }

    const quantity = typeof candidate.quantity === 'string' ? candidate.quantity.trim() : ''
    const note = typeof candidate.note === 'string' ? candidate.note.trim() : ''
    const unitId = typeof candidate.unitId === 'string' && candidate.unitId.trim() ? candidate.unitId.trim() : ''

    if (quantity.length > MAX_QUANTITY_LENGTH) {
      throw new Error(`Ingredient quantities must be ${MAX_QUANTITY_LENGTH} characters or fewer.`)
    }

    if (note.length > MAX_INGREDIENT_NOTE_LENGTH) {
      throw new Error(`Ingredient notes must be ${MAX_INGREDIENT_NOTE_LENGTH} characters or fewer.`)
    }

    if (unitId && !isValidCuid(unitId)) {
      throw new Error(`Ingredient item row ${index + 1} has an invalid unit.`)
    }

    return {
      kind,
      ingredientId: ingredientId || undefined,
      quantity: quantity || undefined,
      unitId: unitId || undefined,
      note: note || undefined,
    }
  })
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const names: string[] = []

  for (const rawTag of value) {
    if (typeof rawTag !== 'string') continue
    const trimmed = rawTag.trim()
    if (!trimmed) continue
    if (trimmed.length > MAX_TAG_LENGTH) {
      throw new Error(`Tags must be ${MAX_TAG_LENGTH} characters or fewer.`)
    }
    const normalized = normalizeLower(trimmed)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      names.push(normalized)
    }
  }

  return names
}

export function parseRecipePayload(
  body: unknown,
  opts?: { allowEmptyTitle?: boolean; allowIncompleteItems?: boolean }
): ParsedRecipePayload {
  const data = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}

  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (!title && !opts?.allowEmptyTitle) {
    throw new Error('Recipe title is required.')
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Recipe title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
  }

  const cookbookIdRaw = typeof data.cookbookId === 'string' ? data.cookbookId.trim() : ''
  const cookbookId = cookbookIdRaw ? cookbookIdRaw : null
  if (cookbookId && !isValidCuid(cookbookId)) {
    throw new Error('Invalid cookbookId.')
  }

  const sourceUrlRaw = parseOptionalString(data.sourceUrl)
  const instructions = parseInstructions(data.instructions, {
    allowEmptyText: opts?.allowIncompleteItems,
  })
  const ingredientRows = parseIngredientRows(data.ingredientRows, {
    allowIncompleteItems: opts?.allowIncompleteItems,
  })
  const tagNames = parseTags(data.tags)

  return {
    title,
    cookbookId,
    servings: parseOptionalInt(data.servings, 'servings'),
    prepMinutes: parseOptionalInt(data.prepMinutes, 'prepMinutes'),
    cookMinutes: parseOptionalInt(data.cookMinutes, 'cookMinutes'),
    sourceUrl: sourceUrlRaw,
    instructions,
    ingredientRows,
    tagNames,
    imagePath: parseOptionalString(data.imagePath),
    imageMimeType: parseOptionalString(data.imageMimeType),
    imageWidth: parseOptionalInt(data.imageWidth, 'imageWidth'),
    imageHeight: parseOptionalInt(data.imageHeight, 'imageHeight'),
    imageSizeBytes: parseOptionalInt(data.imageSizeBytes, 'imageSizeBytes'),
  }
}

export async function resolveTagIds(
  tx: Prisma.TransactionClient,
  householdId: string,
  tagNames: string[]
): Promise<string[]> {
  const tagIds: string[] = []

  for (const tagName of tagNames) {
    const normalized = normalizeLower(tagName)
    const tag = await tx.recipeTag.upsert({
      where: {
        householdId_nameNormalized: {
          householdId,
          nameNormalized: normalized,
        },
      },
      create: {
        householdId,
        name: normalized,
        nameNormalized: normalized,
      },
      update: {
        name: normalized,
      },
      select: { id: true },
    })
    tagIds.push(tag.id)
  }

  return tagIds
}

export function mapInstructionRows(instructions: unknown): InstructionRowInput[] {
  if (!Array.isArray(instructions)) return []

  return instructions.flatMap((row) => {
    if (typeof row !== 'object' || row === null) return []
    const candidate = row as { kind?: unknown; text?: unknown }
    if ((candidate.kind !== 'heading' && candidate.kind !== 'item') || typeof candidate.text !== 'string') {
      return []
    }
    return [{ kind: candidate.kind, text: candidate.text }]
  })
}

export function mapRecipeStatus(status: RecipeStatus): 'draft' | 'published' {
  return status === 'PUBLISHED' ? 'published' : 'draft'
}

export function ingredientRowKindToApi(kind: RecipeIngredientRowKind): 'heading' | 'item' {
  return kind === 'HEADING' ? 'heading' : 'item'
}
