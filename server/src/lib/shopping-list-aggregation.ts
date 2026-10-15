import { parseQuantity } from './recipe-quantity-scaling'

export interface QuantityEntry {
  amount: number | null
  text: string | null
  unitId: string | null
  unitName: string | null
}

export interface IngredientRowInput {
  ingredientId: string | null
  ingredientName: string | null
  quantity: string | null
  unitId: string | null
  unitName: string | null
  note: string | null
  /** mealPlanItem.servings / recipe.servings (1 when unknown). */
  factor: number
}

export interface AggregatedItem {
  ingredientId: string | null
  name: string
  nameNormalized: string
  quantities: QuantityEntry[]
}

export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase()
}

function roundAmount(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

/** Computes the numeric amount of a recipe quantity string; ranges use their upper bound. */
function toAmount(quantity: string, factor: number): number | null {
  const parsed = parseQuantity(quantity)
  if (!parsed) return null
  const base = parsed.single ? parsed.single.value : parsed.range ? parsed.range.end.value : null
  if (base === null) return null
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1
  return roundAmount(base * safeFactor)
}

/** Builds the quantity entry for one recipe row. */
export function toQuantityEntry(row: IngredientRowInput): QuantityEntry {
  const quantity = row.quantity?.trim() || null
  const unit = { unitId: row.unitId, unitName: row.unitName }
  if (!quantity) return { amount: null, text: null, ...unit }

  const amount = toAmount(quantity, row.factor)
  if (amount === null) return { amount: null, text: quantity, ...unit }
  return { amount, text: null, ...unit }
}

/**
 * Adds `incoming` entries into `target` (returns a new array):
 * numeric amounts with the same unit are summed, identical texts are kept once,
 * and empty entries are dropped as soon as a real quantity exists.
 */
export function mergeQuantities(target: QuantityEntry[], incoming: QuantityEntry[]): QuantityEntry[] {
  const result = target.map((entry) => ({ ...entry }))

  for (const entry of incoming) {
    if (entry.amount !== null) {
      const existing = result.find((e) => e.amount !== null && (e.unitId ?? '') === (entry.unitId ?? ''))
      if (existing) {
        existing.amount = roundAmount((existing.amount as number) + entry.amount)
      } else {
        result.push({ ...entry })
      }
    } else if (entry.text !== null) {
      const duplicate = result.some(
        (e) => e.amount === null && e.text === entry.text && (e.unitId ?? '') === (entry.unitId ?? '')
      )
      if (!duplicate) result.push({ ...entry })
    } else if (result.length === 0) {
      result.push({ ...entry })
    }
  }

  if (result.length > 1) {
    return result.filter((entry) => entry.amount !== null || entry.text !== null)
  }
  return result
}

/**
 * Consolidates recipe ingredient rows into one entry per ingredient.
 * Rows without an ingredient fall back to their note as the name (ignored when empty).
 */
export function aggregateIngredientRows(rows: IngredientRowInput[]): AggregatedItem[] {
  const items = new Map<string, AggregatedItem>()

  for (const row of rows) {
    const name = (row.ingredientId ? row.ingredientName : row.note)?.trim()
    if (!name) continue

    const nameNormalized = normalizeItemName(name)
    const key = row.ingredientId ? `id:${row.ingredientId}` : `name:${nameNormalized}`
    const entry = toQuantityEntry(row)

    const current = items.get(key)
    if (current) {
      current.quantities = mergeQuantities(current.quantities, [entry])
    } else {
      items.set(key, {
        ingredientId: row.ingredientId,
        name,
        nameNormalized,
        quantities: mergeQuantities([], [entry]),
      })
    }
  }

  return Array.from(items.values())
}
