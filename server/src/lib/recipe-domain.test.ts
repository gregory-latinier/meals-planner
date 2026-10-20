import { normalizeHeading, normalizeIngredientName, normalizeInstructionHeadings } from './recipe-domain'

describe('normalizeIngredientName', () => {
  it('lowercases and trims', () => {
    expect(normalizeIngredientName('  Farine De Blé ')).toBe('farine de blé')
  })

  it('lowercases accented capitals', () => {
    expect(normalizeIngredientName('Épinards')).toBe('épinards')
  })
})

describe('normalizeHeading', () => {
  it('capitalizes the first letter and trims', () => {
    expect(normalizeHeading('  pour la pâte')).toBe('Pour la pâte')
  })

  it('does not lowercase the rest of the heading', () => {
    expect(normalizeHeading('pour la sauce BBQ')).toBe('Pour la sauce BBQ')
  })

  it('capitalizes an accented first letter', () => {
    expect(normalizeHeading('épices')).toBe('Épices')
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeHeading('   ')).toBe('')
  })
})

describe('normalizeInstructionHeadings', () => {
  it('capitalizes only heading rows', () => {
    expect(
      normalizeInstructionHeadings([
        { kind: 'heading', text: 'préparation' },
        { kind: 'item', text: 'mélanger la farine' },
      ])
    ).toEqual([
      { kind: 'heading', text: 'Préparation' },
      { kind: 'item', text: 'mélanger la farine' },
    ])
  })

  it('leaves malformed rows and non-arrays untouched', () => {
    expect(normalizeInstructionHeadings(null)).toBeNull()
    expect(normalizeInstructionHeadings([null, { kind: 'heading' }, 'x'])).toEqual([null, { kind: 'heading' }, 'x'])
  })
})
