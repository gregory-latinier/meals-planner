import { AiAdminForm } from "@/components/ai-admin-form";
import { getAiSettings } from "@/lib/meal-library-db";
import { requireAuthenticatedPage } from "@/lib/auth-session";

export default async function AiAdminPage() {
  await requireAuthenticatedPage();

  const settings = await getAiSettings();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">AI Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure shared Gemini provider settings used for meal ingredient extraction across this app instance.
        </p>
      </header>

      <AiAdminForm
        hasGeminiApiToken={settings.geminiApiToken.trim().length > 0}
        models={settings.models}
        activeModel={settings.activeModel}
      />
    </main>
  );
}
