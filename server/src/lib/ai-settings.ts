import type { RecipeImageProvider as DbRecipeImageProvider } from '../types/models.js'

export type ApiRecipeExtractionModel = 'gemini-free'
export type DbRecipeExtractionModel = 'GEMINI_FREE'

export type ApiRecipeImageProvider = 'nano-banana' | 'free-provider'
export { DbRecipeImageProvider }

export const AVAILABLE_RECIPE_EXTRACTION_MODELS: ApiRecipeExtractionModel[] = ['gemini-free']
export const AVAILABLE_RECIPE_IMAGE_PROVIDERS: ApiRecipeImageProvider[] = ['nano-banana', 'free-provider']

export function mapDbModelToApi(model: DbRecipeExtractionModel): ApiRecipeExtractionModel {
  switch (model) {
    case 'GEMINI_FREE':
      return 'gemini-free'
  }
}

export function mapApiModelToDb(model: string): DbRecipeExtractionModel | null {
  if (model === 'gemini-free') return 'GEMINI_FREE'
  return null
}

export function mapDbImageProviderToApi(provider: DbRecipeImageProvider): ApiRecipeImageProvider {
  switch (provider) {
    case 'NANO_BANANA':
      return 'nano-banana'
    case 'FREE_PROVIDER':
      return 'free-provider'
    default:
      return 'nano-banana'
  }
}

export function mapApiImageProviderToDb(provider: string): DbRecipeImageProvider | null {
  if (provider === 'nano-banana') return 'NANO_BANANA'
  if (provider === 'free-provider') return 'FREE_PROVIDER'
  return null
}
