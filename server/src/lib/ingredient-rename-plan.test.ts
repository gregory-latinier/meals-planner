import { planIngredientRename, type IngredientRecord } from './ingredient-rename-plan'

let counter = 0
function ing(name: string, createdAt = `2024-01-0${(counter % 9) + 1}T00:00:00Z`): IngredientRecord {
  counter += 1
  return { id: `ing_${counter}`, name, nameNormalized: name.trim().toLowerCase(), createdAt }
}

describe('planIngredientRename', () => {
  it('returns nothing for an empty search', () => {
    expect(planIngredientRename([ing('œuf')], { find: '  ', replace: 'oeuf' })).toEqual([])
  })

  it('renames by substring and lowercases the result', () => {
    const list = [ing('œuf'), ing('blanc d’œuf'), ing('farine')]
    const plan = planIngredientRename(list, { find: 'œ', replace: 'oe' })

    expect(plan.map((p) => [p.oldName, p.newName])).toEqual([
      ['œuf', 'oeuf'],
      ['blanc d’œuf', 'blanc d’oeuf'],
    ])
    expect(plan.every((p) => p.mergeIntoId === null && p.error === null)).toBe(true)
  })

  it('matches case-insensitively, including accented capitals', () => {
    const plan = planIngredientRename([ing('Œuf')], { find: 'œuf', replace: 'oeuf' })
    expect(plan).toHaveLength(1)
    expect(plan[0].newName).toBe('oeuf')
  })

  it('wholeName leaves ingredients that only contain the search untouched', () => {
    const list = [ing('œuf'), ing('bœuf')]
    const plan = planIngredientRename(list, { find: 'Œuf', replace: 'oeuf', wholeName: true })

    expect(plan.map((p) => p.oldName)).toEqual(['œuf'])
  })

  it('only renames the selected ingredients', () => {
    const list = [ing('œuf'), ing('bœuf')]
    const plan = planIngredientRename(list, { find: 'œuf', replace: 'oeuf' }, new Set([list[0].id]))

    expect(plan.map((p) => p.oldName)).toEqual(['œuf'])
  })

  it('treats the search literally (no regex injection)', () => {
    const list = [ing('a.b'), ing('axb')]
    const plan = planIngredientRename(list, { find: 'a.b', replace: 'c' })

    expect(plan.map((p) => p.oldName)).toEqual(['a.b'])
  })

  it('keeps "$&" in the replacement literal', () => {
    const plan = planIngredientRename([ing('sel')], { find: 'sel', replace: '$&$&' })
    expect(plan[0].newName).toBe('$&$&')
  })

  it('merges into an existing ingredient that already has the new name', () => {
    const existing = ing('oeuf', '2024-01-01T00:00:00Z')
    const accented = ing('Œuf', '2024-02-01T00:00:00Z')
    const plan = planIngredientRename([existing, accented], { find: 'Œuf', replace: 'oeuf' })

    expect(plan).toHaveLength(1)
    expect(plan[0]).toMatchObject({ id: accented.id, mergeIntoId: existing.id, mergeIntoName: 'oeuf' })
  })

  it('merges several renamed ingredients into the oldest one', () => {
    const older = ing('Œuf', '2024-01-01T00:00:00Z')
    const newer = ing('œuf', '2024-03-01T00:00:00Z')
    // Same normalized name would violate the DB constraint; use distinct raw spelling instead
    newer.nameNormalized = 'œuf '
    const plan = planIngredientRename([older, newer], { find: 'œ', replace: 'oe' })

    const byId = new Map(plan.map((p) => [p.id, p]))
    expect(byId.get(older.id)?.mergeIntoId).toBeNull()
    expect(byId.get(newer.id)?.mergeIntoId).toBe(older.id)
  })

  it('reports an empty resulting name as an error and never merges it', () => {
    const plan = planIngredientRename([ing('x')], { find: 'x', replace: '' })
    expect(plan[0]).toMatchObject({ newName: '', error: 'EMPTY_NAME', mergeIntoId: null })
  })

  it('reports a name that is too long', () => {
    const plan = planIngredientRename([ing('x')], { find: 'x', replace: 'a'.repeat(301) })
    expect(plan[0].error).toBe('NAME_TOO_LONG')
  })

  it('skips ingredients whose name would not change', () => {
    expect(planIngredientRename([ing('oeuf')], { find: 'oeuf', replace: 'oeuf' })).toEqual([])
  })
})
