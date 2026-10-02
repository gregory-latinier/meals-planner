import { parseQuantity, scaleQuantityText } from '@/lib/recipe-quantity-scaling'

describe('recipe quantity scaling', () => {
  it('parses decimals, ascii fractions, unicode fractions, and ranges', () => {
    expect(parseQuantity('2')?.single?.value).toBe(2)
    expect(parseQuantity('1.5')?.single?.value).toBe(1.5)
    expect(parseQuantity('1,5')?.single?.value).toBe(1.5)
    expect(parseQuantity('1/2')?.single?.value).toBe(0.5)
    expect(parseQuantity('1 1/2')?.single?.value).toBe(1.5)
    expect(parseQuantity('1½')?.single?.value).toBe(1.5)
    expect(parseQuantity('½')?.single?.value).toBe(0.5)

    const range = parseQuantity('1-2')?.range
    expect(range?.start.value).toBe(1)
    expect(range?.end.value).toBe(2)
  })

  it('scales plain numbers and fractions', () => {
    expect(scaleQuantityText('2', 1.5)).toBe('3')
    expect(scaleQuantityText('1.5', 2)).toBe('3')
    expect(scaleQuantityText('1/2', 2)).toBe('1')
    expect(scaleQuantityText('1 1/2', 1.25)).toBe('1 7/8')
    expect(scaleQuantityText('1½', 2)).toBe('3')
  })

  it('scales ranges and keeps separator style', () => {
    expect(scaleQuantityText('1-2', 2)).toBe('2-4')
    expect(scaleQuantityText('1 to 2', 0.5)).toBe('0.5 to 1')
    expect(scaleQuantityText('1–2', 1.5)).toBe('1.5–3')
  })

  it('returns original text for non-numeric values and invalid factors', () => {
    expect(scaleQuantityText('to taste', 2)).toBe('to taste')
    expect(scaleQuantityText('about 2', 2)).toBe('about 2')
    expect(scaleQuantityText('2 cloves', 2)).toBe('2 cloves')
    expect(scaleQuantityText('2', 0)).toBe('2')
    expect(scaleQuantityText('2', Number.NaN)).toBe('2')
    expect(scaleQuantityText(null, 2)).toBeNull()
  })
})
