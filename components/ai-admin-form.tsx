"use client";

import { useActionState } from "react";
import {
  initialAiSettingsActionState,
  saveAiSettingsAction,
  type AiSettingsActionState,
} from "@/app/admin/ai/actions";

type AiAdminFormProps = {
  hasGeminiApiToken: boolean;
  models: string[];
  activeModel: string;
};

export function AiAdminForm({ hasGeminiApiToken, models, activeModel }: AiAdminFormProps) {
  const [state, formAction, pending] = useActionState<AiSettingsActionState, FormData>(
    saveAiSettingsAction,
    initialAiSettingsActionState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
        Gemini token status: {hasGeminiApiToken ? "token configured" : "not configured"}.
      </p>

      <label className="block text-sm font-medium text-slate-700" htmlFor="geminiApiToken">
        Gemini API token
        <input
          id="geminiApiToken"
          name="geminiApiToken"
          type="password"
          defaultValue=""
          autoComplete="new-password"
          placeholder={hasGeminiApiToken ? "Enter new token to replace existing" : "Enter token"}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700" htmlFor="models">
        Available models (one per line)
        <textarea
          id="models"
          name="models"
          rows={4}
          defaultValue={models.join("\n")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700" htmlFor="activeModel">
        Active model
        <select
          id="activeModel"
          name="activeModel"
          defaultValue={activeModel}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        {pending ? "Saving..." : "Save AI settings"}
      </button>

      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
    </form>
  );
}
