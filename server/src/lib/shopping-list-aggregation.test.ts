import {
  aggregateIngredientRows,
  mergeQuantities,
  type IngredientRowInput,
} from './shopping-list-aggregation'

function row(overrides: Partial<IngredientRowInput>): IngredientRowInput {
  return {
    ingredientId: 'ing_1',
    ingredientName: 'Farine',
    quantity: null,
    unitId: null,
    unitName: null,
    note: null,
    factor: 1,
    ...overrides,
  }
}

describe('aggregateIngredientRows', () => {
  it('sums quantities of the same ingredient and unit', () => {
    const result = aggregateIngredientRows([
      row({ quantity: '200', unitId: 'u_g', unitName: 'g' }),
      row({ quantity: '150', unitId: 'u_g', unitName: 'g' }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].quantities).toEqual([{ amount: 350, text: null, unitId: 'u_g', unitName: 'g' }])
  })

  it('handles fractions and decimals with comma', () => {
    const result = aggregateIngredientRows([
      row({ quantity: '1/2', unitId: 'u_l', unitName: 'l' }),
      row({ quantity: '1,5', unitId: 'u_l', unitName: 'l' }),
      row({ quantity: '½', unitId: 'u_l', unitName: 'l' }),
    ])
    expect(result[0].quantities[0].amount).toBe(2.5)
  })

  it('uses the upper bound of a range', () => {
    const result = aggregateIngredientRows([row({ quantity: '2-3' })])
    expect(result[0].quantities[0].amount).toBe(3)
  })

  it('keeps different units separate', () => {
    const result = aggregateIngredientRows([
      row({ quantity: '200', unitId: 'u_g', unitName: 'g' }),
      row({ quantity: '1', unitId: 'u_cs', unitName: 'c. à soupe' }),
    ])
    expect(result[0].quantities).toHaveLength(2)
  })

  it('keeps non-parseable texts once', () => {
    const result = aggregateIngredientRows([
      row({ quantity: 'une pincée' }),
      row({ quantity: 'une pincée' }),
      row({ quantity: 'au goût' }),
    ])
    expect(result[0].quantities.map((q) => q.text)).toEqual(['une pincée', 'au goût'])
  })

  it('scales amounts by the servings factor', () => {
    const result = aggregateIngredientRows([
      row({ quantity: '200', unitId: 'u_g', unitName: 'g', factor: 1.5 }),
      row({ quantity: '100', unitId: 'u_g', unitName: 'g', factor: 0.5 }),
    ])
    expect(result[0].quantities[0].amount).toBe(350)
  })

  it('falls back to a factor of 1 when it is invalid', () => {
    const result = aggregateIngredientRows([row({ quantity: '2', factor: Number.NaN })])
    expect(result[0].quantities[0].amount).toBe(2)
  })

  it('drops empty quantities when a real quantity exists', () => {
    const result = aggregateIngredientRows([row({ quantity: null }), row({ quantity: '3' })])
    expect(result[0].quantities).toEqual([{ amount: 3, text: null, unitId: null, unitName: null }])
  })

  it('keeps an item without quantity', () => {
    const result = aggregateIngredientRows([row({ quantity: null })])
    expect(result).toHaveLength(1)
    expect(result[0].quantities).toHaveLength(1)
    expect(result[0].quantities[0].amount).toBeNull()
  })

  it('groups rows without ingredient by normalized note and ignores empty ones', () => {
    const result = aggregateIngredientRows([
      row({ ingredientId: null, ingredientName: null, note: 'Sel fin' }),
      row({ ingredientId: null, ingredientName: null, note: ' sel fin ' }),
      row({ ingredientId: null, ingredientName: null, note: '  ' }),
      row({ ingredientId: null, ingredientName: null, note: null }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].nameNormalized).toBe('sel fin')
    expect(result[0].ingredientId).toBeNull()
  })

  it('separates different ingredients', () => {
    const result = aggregateIngredientRows([
      row({ ingredientId: 'a', ingredientName: 'A', quantity: '1' }),
      row({ ingredientId: 'b', ingredientName: 'B', quantity: '1' }),
    ])
    expect(result).toHaveLength(2)
  })
})

describe('mergeQuantities', () => {
  it('sums into existing entries without mutating inputs', () => {
    const target = [{ amount: 100, text: null, unitId: 'u_g', unitName: 'g' }]
    const merged = mergeQuantities(target, [{ amount: 50, text: null, unitId: 'u_g', unitName: 'g' }])
    expect(merged[0].amount).toBe(150)
    expect(target[0].amount).toBe(100)
  })

  it('avoids floating point artefacts', () => {
    const merged = mergeQuantities(
      [{ amount: 0.1, text: null, unitId: null, unitName: null }],
      [{ amount: 0.2, text: null, unitId: null, unitName: null }]
    )
    expect(merged[0].amount).toBe(0.3)
  })
})
