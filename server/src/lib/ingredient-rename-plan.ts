import { normalizeIngredientName, normalizeLower } from './recipe-domain'

export const MAX_INGREDIENT_RENAME_LENGTH = 300

export interface IngredientRecord {
  id: string
  name: string
  nameNormalized: string
  createdAt: Date | string
}

export interface IngredientRenameOptions {
  find: string
  replace: string
  // Only ingredients whose whole name equals `find` (case-insensitive) are renamed
  wholeName?: boolean
}

export interface IngredientRenameEntry {
  id: string
  oldName: string
  newName: string
  // Set when another ingredient already has (or ends up with) the new name:
  // this ingredient is merged into it instead of being renamed.
  mergeIntoId: string | null
  mergeIntoName: string | null
  error: 'EMPTY_NAME' | 'NAME_TOO_LONG' | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toTime(value: Date | string): number {
  return new Date(value).getTime()
}

function byCreatedAt(a: IngredientRecord, b: IngredientRecord): number {
  return toTime(a.createdAt) - toTime(b.createdAt) || a.id.localeCompare(b.id)
}

/**
 * Computes what a bulk rename would do, without touching the database.
 * When `selectedIds` is given, only those ingredients are renamed; the others are left as is.
 */
export function planIngredientRename(
  ingredients: IngredientRecord[],
  options: IngredientRenameOptions,
  selectedIds?: Set<string>
): IngredientRenameEntry[] {
  const find = options.find.trim()
  if (!find) return []

  const matcher = new RegExp(escapeRegExp(find), 'giu')
  const wholeNameKey = normalizeLower(find)

  const entries = new Map<string, IngredientRenameEntry>()
  const recordById = new Map<string, IngredientRecord>()

  for (const ingredient of ingredients) {
    recordById.set(ingredient.id, ingredient)
    if (selectedIds && !selectedIds.has(ingredient.id)) continue

    let replaced: string
    if (options.wholeName) {
      if (normalizeLower(ingredient.name) !== wholeNameKey) continue
      replaced = options.replace
    } else {
      matcher.lastIndex = 0
      if (!matcher.test(ingredient.name)) continue
      matcher.lastIndex = 0
      replaced = ingredient.name.replace(matcher, () => options.replace)
    }

    const newName = normalizeIngredientName(replaced.replace(/\s+/g, ' '))
    if (newName === ingredient.name) continue

    entries.set(ingredient.id, {
      id: ingredient.id,
      oldName: ingredient.name,
      newName,
      mergeIntoId: null,
      mergeIntoName: null,
      error: !newName ? 'EMPTY_NAME' : newName.length > MAX_INGREDIENT_RENAME_LENGTH ? 'NAME_TOO_LONG' : null,
    })
  }

  // Group by final name to detect merges (an existing ingredient already has the name,
  // or several renamed ingredients end up with the same name).
  const groups = new Map<string, { unchanged: IngredientRecord[]; renamed: IngredientRecord[] }>()
  for (const ingredient of ingredients) {
    const entry = entries.get(ingredient.id)
    const renamed = entry !== undefined && entry.error === null
    const key = renamed ? entry.newName : ingredient.nameNormalized
    const group = groups.get(key) ?? { unchanged: [], renamed: [] }
    ;(renamed ? group.renamed : group.unchanged).push(ingredient)
    groups.set(key, group)
  }

  for (const [key, group] of groups) {
    if (group.renamed.length === 0 || group.renamed.length + group.unchanged.length < 2) continue

    const survivor = [...group.unchanged].sort(byCreatedAt)[0] ?? [...group.renamed].sort(byCreatedAt)[0]
    const survivorName = recordById.get(survivor.id)!.nameNormalized === key ? recordById.get(survivor.id)!.name : key

    for (const ingredient of group.renamed) {
      if (ingredient.id === survivor.id) continue
      const entry = entries.get(ingredient.id)!
      entry.mergeIntoId = survivor.id
      entry.mergeIntoName = survivorName
    }
  }

  return [...entries.values()]
}
