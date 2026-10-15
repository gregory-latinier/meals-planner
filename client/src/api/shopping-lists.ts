import type { ShoppingList, ShoppingListItem, ShoppingListSummary } from '../types/models'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export interface ShoppingListWithItems {
  list: ShoppingList | null
  items: ShoppingListItem[]
}

export interface GenerateResult {
  listId: string
  added: number
  merged: number
  pantryCheck: number
  meals: number
}

export interface UpdateItemPayload {
  checked?: boolean
  name?: string
  quantityText?: string | null
  storeId?: string | null
  pantryCheck?: boolean
}

export function fetchShoppingLists() {
  return request<{ active: ShoppingListSummary | null; history: ShoppingListSummary[] }>('/api/shopping-lists')
}

export function fetchActiveShoppingList() {
  return request<ShoppingListWithItems>('/api/shopping-lists/active')
}

export function fetchShoppingList(id: string) {
  return request<ShoppingListWithItems>(`/api/shopping-lists/${id}`)
}

export function generateShoppingList(startDate: string, endDate: string) {
  return request<GenerateResult>('/api/shopping-lists/active/generate', {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  })
}

export function addShoppingListItem(payload: { name: string; quantityText?: string | null; storeId?: string | null }) {
  return request<{ item: ShoppingListItem }>('/api/shopping-lists/active/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function copyShoppingListItems(itemIds: string[]) {
  return request<{ added: number; merged: number }>('/api/shopping-lists/active/items/copy', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
}

export function updateShoppingListItem(itemId: string, payload: UpdateItemPayload) {
  return request<{ item: ShoppingListItem }>(`/api/shopping-lists/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteShoppingListItem(itemId: string, alwaysInStock = false) {
  return request<{ success: boolean }>(
    `/api/shopping-lists/items/${itemId}${alwaysInStock ? '?alwaysInStock=true' : ''}`,
    { method: 'DELETE' }
  )
}

export function setIngredientInStock(ingredientId: string, alwaysInStock: boolean) {
  return request<{ success: boolean }>(`/api/shopping-lists/ingredients/${ingredientId}/in-stock`, {
    method: 'PUT',
    body: JSON.stringify({ alwaysInStock }),
  })
}

export function completeShoppingList(carryOver: boolean) {
  return request<{ success: boolean; carried: number }>('/api/shopping-lists/active/complete', {
    method: 'POST',
    body: JSON.stringify({ carryOver }),
  })
}
