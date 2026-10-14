export type RecipeStatus = 'DRAFT' | 'PUBLISHED'
export type RecipeIngredientRowKind = 'HEADING' | 'ITEM'
export type RecipeExtractionModel = 'GEMINI_FREE'
export type RecipeImageProvider = 'NANO_BANANA' | 'FREE_PROVIDER'

export interface Household {
  id: string
  passwordHash: string
  recipeExtractionModel: RecipeExtractionModel
  recipeImageProvider: RecipeImageProvider
  geminiApiKeyEncrypted: string | null
  geminiApiKeyMasked: string | null
  geminiApiKeyUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface HouseholdPreferences {
  householdId: string
  defaultMealPlanServings: number
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  token: string
  householdId: string
  expiresAt: Date
  createdAt: Date
}

export interface PasswordResetToken {
  id: string
  token: string
  householdId: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

export interface Cookbook {
  id: string
  householdId: string
  name: string
  nameNormalized: string
  createdAt: Date
  updatedAt: Date
}

export interface Store {
  id: string
  householdId: string
  name: string
  nameNormalized: string
  createdAt: Date
  updatedAt: Date
}

export interface Recipe {
  id: string
  householdId: string
  cookbookId: string | null
  title: string
  status: RecipeStatus
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  sourceUrl: string | null
  instructions: any
  imagePath: string | null
  imageMimeType: string | null
  imageWidth: number | null
  imageHeight: number | null
  imageSizeBytes: number | null
  draftSavedAt: Date | null
  lastAutosavedAt: Date | null
  autosaveVersion: number
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface RecipeTag {
  id: string
  householdId: string
  name: string
  nameNormalized: string
  createdAt: Date
  updatedAt: Date
}

export interface Ingredient {
  id: string
  householdId: string
  name: string
  nameNormalized: string
  createdAt: Date
  updatedAt: Date
}

export interface IngredientTranslation {
  id: string
  ingredientId: string
  locale: string
  name: string
  nameNormalized: string
  createdAt: Date
  updatedAt: Date
}

export interface Unit {
  id: string
  householdId: string
  name: string
  nameNormalized: string
  createdAt: Date
  updatedAt: Date
}

export interface RecipeIngredientRow {
  id: string
  recipeId: string
  position: number
  kind: RecipeIngredientRowKind
  heading: string | null
  ingredientId: string | null
  quantity: string | null
  unitId: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

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
  createdAt: Date
  updatedAt: Date
}

export interface MealPlanItemWithRecipe extends MealPlanItem {
  recipeTitle?: string | null
  recipeCoverImagePath?: string | null
}

