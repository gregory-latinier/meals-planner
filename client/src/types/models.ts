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
  recipePrepMinutes?: number | null
}
