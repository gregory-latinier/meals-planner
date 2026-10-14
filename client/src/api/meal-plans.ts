import { MealPlanItemWithRecipe } from '../types/models'

export interface FetchMealPlansParams {
  startDate?: string
  endDate?: string
  weekStartDate?: string
}

export interface CreateMealPlanPayload {
  title: string
  recipeId?: string | null
  date?: string | null
  weekStartDate: string
  mealType?: string
  servings?: number | null
  notes?: string | null
  position?: number
}

export interface UpdateMealPlanPayload {
  title?: string
  recipeId?: string | null
  date?: string | null
  weekStartDate?: string
  mealType?: string
  servings?: number | null
  completed?: boolean
  notes?: string | null
  position?: number
}

export async function fetchMealPlans(params?: FetchMealPlansParams): Promise<MealPlanItemWithRecipe[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.weekStartDate) searchParams.set('weekStartDate', params.weekStartDate)

  const query = searchParams.toString()
  const url = query ? `/api/meal-plans?${query}` : '/api/meal-plans'

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch meal plans')
  }
  const data = await res.json()
  return data.mealPlans || []
}

export async function createMealPlan(payload: CreateMealPlanPayload): Promise<MealPlanItemWithRecipe> {
  const res = await fetch('/api/meal-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('Failed to create meal plan')
  }
  const data = await res.json()
  return data.mealPlan
}

export async function updateMealPlan(
  id: string,
  payload: UpdateMealPlanPayload
): Promise<MealPlanItemWithRecipe> {
  const res = await fetch(`/api/meal-plans/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('Failed to update meal plan')
  }
  const data = await res.json()
  return data.mealPlan
}

export async function deleteMealPlan(id: string): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`/api/meal-plans/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('Failed to delete meal plan')
  }
  return res.json()
}
