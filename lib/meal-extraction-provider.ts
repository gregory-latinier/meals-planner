import { extractIngredientsWithGemini } from "@/lib/meal-extraction-gemini";
import type { ExtractedIngredient } from "@/lib/meal-library-types";

type MealExtractionRequest = {
  provider: "gemini";
  apiToken: string;
  model: string;
  mealName: string;
  recipe: string;
  url: string | null;
};

export async function extractMealIngredients(request: MealExtractionRequest): Promise<ExtractedIngredient[]> {
  switch (request.provider) {
    case "gemini":
      return extractIngredientsWithGemini(request);
    default:
      throw new Error("Unsupported extraction provider.");
  }
}
