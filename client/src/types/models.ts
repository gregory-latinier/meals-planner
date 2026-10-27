export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | string

export interface MealPlanItem {
  id: string
  householdId: string
  recipeId: string | null
  title: string
  date: string | null // YYYY-MM-DD
  weekStartDate: string // YYYY-MM-DD
  mealType: MealType
  servings: number | null
  completed: boolean
  notes: string | null
  position: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface MealPlanItemWithRecipe extends MealPlanItem {
  recipeTitle?: string | null
  recipeCoverImagePath?: string | null
  recipeTotalMinutes?: number | null
}

export interface ShoppingListQuantityEntry {
  amount: number | null
  text: string | null
  unitId: string | null
  unitName: string | null
}

export interface ShoppingListItem {
  id: string
  listId: string
  ingredientId: string | null
  name: string
  nameNormalized: string
  quantities: ShoppingListQuantityEntry[]
  quantityText: string | null
  storeId: string | null
  storeName: string | null
  source: 'RECIPE' | 'MANUAL'
  pantryCheck: boolean
  checked: boolean
  checkedAt: string | null
  position: number
}

export interface ShoppingList {
  id: string
  status: 'ACTIVE' | 'COMPLETED'
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface ShoppingListSummary {
  id: string
  status: 'ACTIVE' | 'COMPLETED'
  createdAt: string
  completedAt: string | null
  itemCount: number
  checkedCount: number
}
