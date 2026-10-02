export type ApiRecipeExtractionModel = 'gemini-free'

export type DbRecipeExtractionModel = 'GEMINI_FREE'

export const AVAILABLE_RECIPE_EXTRACTION_MODELS: ApiRecipeExtractionModel[] = ['gemini-free']

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
