"use server";

import { revalidatePath } from "next/cache";
import { queueExtractionForMeal, createMeal, updateMeal } from "@/lib/meal-library-db";
import { triggerExtractionRunner } from "@/lib/meal-extraction-runner";
import { requireAuthenticatedAction } from "@/lib/auth-session";

export type MealActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export const initialMealActionState: MealActionState = {
  ok: false,
};

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeMealInput(formData: FormData): { name: string; recipe: string; url: string; photoUrl: string } {
  return {
    name: readField(formData, "name"),
    recipe: readField(formData, "recipe"),
    url: readField(formData, "url"),
    photoUrl: readField(formData, "photoUrl"),
  };
}

function validateMealInput(input: { name: string; recipe: string }): string | undefined {
  if (!input.name) {
    return "Meal name is required.";
  }

  if (!input.recipe) {
    return "Recipe text is required.";
  }

  return undefined;
}

export async function createMealAction(_prevState: MealActionState, formData: FormData): Promise<MealActionState> {
  const authError = await requireAuthenticatedAction();

  if (authError) {
    return authError;
  }

  const input = normalizeMealInput(formData);
  const validationError = validateMealInput(input);

  if (validationError) {
    return {
      ok: false,
      error: validationError,
    };
  }

  await createMeal(input);
  revalidatePath("/library");

  return {
    ok: true,
    message: "Meal saved.",
  };
}

export async function updateMealAction(_prevState: MealActionState, formData: FormData): Promise<MealActionState> {
  const authError = await requireAuthenticatedAction();

  if (authError) {
    return authError;
  }

  const mealId = readField(formData, "mealId");

  if (!mealId) {
    return {
      ok: false,
      error: "Meal ID is missing.",
    };
  }

  const input = normalizeMealInput(formData);
  const validationError = validateMealInput(input);

  if (validationError) {
    return {
      ok: false,
      error: validationError,
    };
  }

  const updated = await updateMeal(mealId, input);

  if (!updated) {
    return {
      ok: false,
      error: "Meal was not found. Refresh and try again.",
    };
  }

  revalidatePath("/library");

  return {
    ok: true,
    message: "Meal updated.",
  };
}

export async function triggerMealExtractionAction(mealId: string): Promise<MealActionState> {
  const authError = await requireAuthenticatedAction();

  if (authError) {
    return authError;
  }

  if (!mealId.trim()) {
    return {
      ok: false,
      error: "Meal ID is required for extraction.",
    };
  }

  const queued = await queueExtractionForMeal(mealId);

  if (!queued) {
    return {
      ok: false,
      error: "Meal was not found. Refresh and try again.",
    };
  }

  // MVP async pattern: enqueue and return immediately; background loop updates status later.
  triggerExtractionRunner();
  revalidatePath("/library");

  return {
    ok: true,
    message: "Extraction queued.",
  };
}
