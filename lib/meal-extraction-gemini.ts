import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedIngredient } from "@/lib/meal-library-types";

type ExtractionInput = {
  mealName: string;
  recipe: string;
  url: string | null;
};

function sanitizeIngredients(value: unknown): ExtractedIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const parsed = item as Record<string, unknown>;

      if (typeof parsed.name !== "string" || parsed.name.trim().length === 0) {
        return undefined;
      }

      const ingredient: ExtractedIngredient = {
        name: parsed.name.trim(),
      };

      const amountPerServing = typeof parsed.amountPerServing === "string" ? parsed.amountPerServing.trim() : "";
      const notes = typeof parsed.notes === "string" ? parsed.notes.trim() : "";

      if (amountPerServing) {
        ingredient.amountPerServing = amountPerServing;
      }

      if (notes) {
        ingredient.notes = notes;
      }

      return ingredient;
    })
    .filter((entry): entry is ExtractedIngredient => entry !== undefined);
}

function normalizeModelOutput(rawText: string): string {
  const trimmed = rawText.trim();

  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return trimmed;
  }

  const withoutFenceStart = trimmed.replace(/^```(?:json)?\s*/i, "");
  return withoutFenceStart.replace(/\s*```$/, "").trim();
}

function buildPrompt(input: ExtractionInput): string {
  return [
    "You are extracting ingredient data from a meal for grocery planning.",
    "Return STRICT JSON only, no markdown, no prose.",
    "Schema:",
    '{"ingredients":[{"name":"string","amountPerServing":"string (optional)","notes":"string (optional)"}]}',
    "If unsure about quantity, omit amountPerServing.",
    "Use concise ingredient names.",
    `Meal name: ${input.mealName}`,
    input.url ? `Recipe URL: ${input.url}` : "Recipe URL: (none)",
    "Recipe text:",
    input.recipe,
  ].join("\n");
}

export async function extractIngredientsWithGemini(input: {
  apiToken: string;
  model: string;
  mealName: string;
  recipe: string;
  url: string | null;
}): Promise<ExtractedIngredient[]> {
  const client = new GoogleGenerativeAI(input.apiToken);
  const model = client.getGenerativeModel({ model: input.model });

  const response = await model.generateContent(buildPrompt(input));
  const rawText = response.response.text();
  const jsonText = normalizeModelOutput(rawText);

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Gemini returned a non-JSON response. Update prompt/model settings and retry extraction.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini returned an invalid payload shape. Expected an object with an ingredients array.");
  }

  const payload = parsed as Record<string, unknown>;
  return sanitizeIngredients(payload.ingredients);
}

export const __testables = {
  sanitizeIngredients,
  normalizeModelOutput,
  buildPrompt,
};
