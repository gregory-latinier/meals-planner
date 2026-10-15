import type { ShoppingListItem, ShoppingListQuantityEntry } from '../types/models'

function formatAmount(amount: number): string {
  return String(Number(amount.toFixed(2))).replace('.', ',')
}

export function formatQuantityEntry(entry: ShoppingListQuantityEntry): string {
  const parts: string[] = []
  if (entry.amount !== null) parts.push(formatAmount(entry.amount))
  else if (entry.text) parts.push(entry.text)
  if (entry.unitName) parts.push(entry.unitName)
  return parts.join(' ')
}

export function formatQuantities(entries: ShoppingListQuantityEntry[]): string {
  return entries
    .map(formatQuantityEntry)
    .filter((part) => part.length > 0)
    .join(' + ')
}

/** Manual text takes priority over the quantities computed from recipes. */
export function formatItemQuantity(item: Pick<ShoppingListItem, 'quantityText' | 'quantities'>): string {
  return item.quantityText || formatQuantities(item.quantities)
}
