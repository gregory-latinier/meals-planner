"use server";

import { revalidatePath } from "next/cache";
import { getAiSettings, saveAiSettings } from "@/lib/meal-library-db";
import { requireAuthenticatedAction } from "@/lib/auth-session";

export type AiSettingsActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export const initialAiSettingsActionState: AiSettingsActionState = {
  ok: false,
};

function parseModels(value: string): string[] {
  const models = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return Array.from(new Set(models));
}

function readStringField(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveAiSettingsAction(
  _prevState: AiSettingsActionState,
  formData: FormData,
): Promise<AiSettingsActionState> {
  const authError = await requireAuthenticatedAction();

  if (authError) {
    return authError;
  }

  const geminiApiToken = readStringField(formData, "geminiApiToken");
  const models = parseModels(readStringField(formData, "models"));
  const activeModel = readStringField(formData, "activeModel");

  if (models.length === 0) {
    return {
      ok: false,
      error: "At least one model is required.",
    };
  }

  if (!activeModel) {
    return {
      ok: false,
      error: "Active model is required.",
    };
  }

  if (!models.includes(activeModel)) {
    return {
      ok: false,
      error: "Active model must be included in the available models list.",
    };
  }

  const currentSettings = await getAiSettings();
  const resolvedToken = geminiApiToken || currentSettings.geminiApiToken;

  await saveAiSettings({
    geminiApiToken: resolvedToken,
    models,
    activeModel,
  });

  revalidatePath("/admin/ai");

  return {
    ok: true,
    message: "AI settings saved.",
  };
}
