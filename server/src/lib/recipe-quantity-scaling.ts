const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
}

type QuantityStyle = 'fraction' | 'decimal'

interface ParsedSingleQuantity {
  value: number
  style: QuantityStyle
}

interface ParsedRangeQuantity {
  start: ParsedSingleQuantity
  end: ParsedSingleQuantity
  separator: '-' | '–' | '—' | 'to'
}

interface ParsedQuantity {
  single?: ParsedSingleQuantity
  range?: ParsedRangeQuantity
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const tmp = y
    y = x % y
    x = tmp
  }
  return x || 1
}

function toDecimalString(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return String(Number(value.toFixed(2)))
}

function toMixedFractionString(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  const whole = Math.floor(value)
  const fraction = value - whole
  const denominators = [2, 3, 4, 5, 6, 8, 10, 12, 16]

  let bestDenominator = denominators[0]
  let bestNumerator = Math.round(fraction * bestDenominator)
  let bestError = Math.abs(fraction - bestNumerator / bestDenominator)

  for (const denominator of denominators.slice(1)) {
    const numerator = Math.round(fraction * denominator)
    const error = Math.abs(fraction - numerator / denominator)
    if (error < bestError) {
      bestError = error
      bestDenominator = denominator
      bestNumerator = numerator
    }
  }

  if (bestError > 0.02 || bestNumerator === 0) {
    return toDecimalString(value)
  }

  if (bestNumerator >= bestDenominator) {
    const overflowWhole = Math.floor(bestNumerator / bestDenominator)
    const remainingNumerator = bestNumerator % bestDenominator
    if (remainingNumerator === 0) {
      return String(whole + overflowWhole)
    }
    const divisor = gcd(remainingNumerator, bestDenominator)
    const num = remainingNumerator / divisor
    const den = bestDenominator / divisor
    return `${whole + overflowWhole} ${num}/${den}`
  }

  const divisor = gcd(bestNumerator, bestDenominator)
  const numerator = bestNumerator / divisor
  const denominator = bestDenominator / divisor

  if (whole === 0) {
    return `${numerator}/${denominator}`
  }
  return `${whole} ${numerator}/${denominator}`
}

function parseAsciiFraction(value: string): number | null {
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) return null
  const numerator = Number(match[1])
  const denominator = Number(match[2])
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null
  }
  return numerator / denominator
}

function parseDecimal(value: string): number | null {
  const normalized = value.replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseSingleQuantity(value: string): ParsedSingleQuantity | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const unicodeOnly = trimmed.length === 1 ? UNICODE_FRACTIONS[trimmed] : undefined
  if (unicodeOnly !== undefined) {
    return { value: unicodeOnly, style: 'fraction' }
  }

  const combinedUnicode = trimmed.match(/^(\d+)\s*([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/)
  if (combinedUnicode) {
    const whole = Number(combinedUnicode[1])
    const fractionValue = UNICODE_FRACTIONS[combinedUnicode[2]]
    return { value: whole + fractionValue, style: 'fraction' }
  }

  const mixedAsciiFraction = trimmed.match(/^(\d+)\s+(\d+\s*\/\s*\d+)$/)
  if (mixedAsciiFraction) {
    const whole = Number(mixedAsciiFraction[1])
    const fractionValue = parseAsciiFraction(mixedAsciiFraction[2])
    if (fractionValue === null) return null
    return { value: whole + fractionValue, style: 'fraction' }
  }

  const asciiFraction = parseAsciiFraction(trimmed)
  if (asciiFraction !== null) {
    return { value: asciiFraction, style: 'fraction' }
  }

  const decimal = parseDecimal(trimmed)
  if (decimal !== null) {
    return {
      value: decimal,
      style: trimmed.includes('/') || Object.keys(UNICODE_FRACTIONS).some((fraction) => trimmed.includes(fraction))
        ? 'fraction'
        : 'decimal',
    }
  }

  return null
}

export function parseQuantity(quantity: string): ParsedQuantity | null {
  const trimmed = quantity.trim()
  if (!trimmed) return null

  const rangeMatch = trimmed.match(/^(.+?)\s*(\-|–|—|to)\s*(.+)$/i)
  if (rangeMatch) {
    const start = parseSingleQuantity(rangeMatch[1])
    const end = parseSingleQuantity(rangeMatch[3])
    if (start && end) {
      const separator = rangeMatch[2] as '-' | '–' | '—' | 'to'
      return {
        range: {
          start,
          end,
          separator,
        },
      }
    }
  }

  const single = parseSingleQuantity(trimmed)
  if (!single) return null
  return { single }
}

function formatScaledSingle(quantity: ParsedSingleQuantity, factor: number): string {
  const scaled = quantity.value * factor
  if (!Number.isFinite(scaled) || scaled < 0) {
    return ''
  }

  if (quantity.style === 'fraction') {
    return toMixedFractionString(scaled)
  }
  return toDecimalString(scaled)
}

export function scaleQuantityText(quantity: string | null, factor: number): string | null {
  if (quantity === null) return null
  const trimmed = quantity.trim()
  if (!trimmed) return quantity

  if (!Number.isFinite(factor) || factor <= 0) {
    return quantity
  }

  if (Math.abs(factor - 1) < 0.000_001) {
    return quantity
  }

  const parsed = parseQuantity(trimmed)
  if (!parsed) return quantity

  if (parsed.single) {
    const result = formatScaledSingle(parsed.single, factor)
    return result || quantity
  }

  if (parsed.range) {
    const start = formatScaledSingle(parsed.range.start, factor)
    const end = formatScaledSingle(parsed.range.end, factor)
    if (!start || !end) return quantity

    const separator = parsed.range.separator.toLowerCase() === 'to' ? ' to ' : parsed.range.separator
    return `${start}${separator}${end}`
  }

  return quantity
}
