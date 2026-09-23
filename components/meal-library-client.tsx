"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MealLibraryViewMode, MealRecord } from "@/lib/meal-library-types";
import {
  createMealAction,
  initialMealActionState,
  triggerMealExtractionAction,
  updateMealAction,
} from "@/app/library/actions";

type MealLibraryClientProps = {
  meals: MealRecord[];
  initialViewMode: MealLibraryViewMode;
};

function ExtractionStatusPill({ meal }: { meal: MealRecord }) {
  const baseClass = "inline-flex rounded-full px-2 py-1 text-xs font-medium";

  if (meal.extractionStatus === "success") {
    return <span className={`${baseClass} bg-emerald-100 text-emerald-800`}>Success</span>;
  }

  if (meal.extractionStatus === "running") {
    return <span className={`${baseClass} bg-blue-100 text-blue-800`}>Running</span>;
  }

  if (meal.extractionStatus === "failed") {
    return <span className={`${baseClass} bg-red-100 text-red-800`}>Failed</span>;
  }

  return <span className={`${baseClass} bg-slate-100 text-slate-700`}>Pending</span>;
}

function MealEditor({
  mode,
  meal,
  onDone,
  onSaved,
}: {
  mode: "create" | "edit";
  meal?: MealRecord;
  onDone?: () => void;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createMealAction : updateMealAction,
    initialMealActionState,
  );
  const [lastHandledSuccessMessage, setLastHandledSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok || !state.message || state.message === lastHandledSuccessMessage) {
      return;
    }

    setLastHandledSuccessMessage(state.message);
    onSaved?.();

    if (mode === "edit") {
      onDone?.();
    }
  }, [lastHandledSuccessMessage, mode, onDone, onSaved, state.message, state.ok]);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {mode === "edit" && meal ? <input type="hidden" name="mealId" value={meal.id} /> : null}

      <label className="block text-sm font-medium text-slate-700" htmlFor={`${mode}-name`}>
        Name
        <input
          id={`${mode}-name`}
          name="name"
          type="text"
          defaultValue={meal?.name ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700" htmlFor={`${mode}-recipe`}>
        Recipe
        <textarea
          id={`${mode}-recipe`}
          name="recipe"
          rows={5}
          defaultValue={meal?.recipe ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700" htmlFor={`${mode}-url`}>
        URL
        <input
          id={`${mode}-url`}
          name="url"
          type="url"
          defaultValue={meal?.url ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700" htmlFor={`${mode}-photo`}>
        Photo URL
        <input
          id={`${mode}-photo`}
          name="photoUrl"
          type="url"
          defaultValue={meal?.photoUrl ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {pending ? "Saving..." : mode === "create" ? "Save meal" : "Save changes"}
        </button>

        {onDone ? (
          <button type="button" onClick={onDone} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Cancel
          </button>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
    </form>
  );
}

function MealCard({ meal, onExtract, extracting, onEdit }: {
  meal: MealRecord;
  onExtract: (mealId: string) => void;
  extracting: boolean;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{meal.name}</h3>
        <ExtractionStatusPill meal={meal} />
      </div>

      {meal.url ? (
        <a href={meal.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-700 underline">
          Open recipe URL
        </a>
      ) : null}

      {meal.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meal.photoUrl} alt={`${meal.name} photo`} className="mt-3 h-36 w-full rounded-lg object-cover" />
      ) : null}

      <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm text-slate-600">{meal.recipe}</p>

      {meal.extractedIngredients.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {meal.extractedIngredients.map((ingredient, index) => (
            <li key={`${meal.id}-ingredient-${index}`}>
              <span className="font-medium">{ingredient.name}</span>
              {ingredient.amountPerServing ? ` — ${ingredient.amountPerServing}` : ""}
              {ingredient.notes ? ` (${ingredient.notes})` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {meal.extractionStatus === "failed" && meal.extractionError ? (
        <p className="mt-3 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{meal.extractionError}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onExtract(meal.id)}
          disabled={extracting}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
        >
          {extracting ? "Queueing..." : "Extract ingredients"}
        </button>
        <button type="button" onClick={onEdit} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700">
          Edit
        </button>
      </div>
    </article>
  );
}

function MealTable({
  meals,
  onExtract,
  activeExtractionMealId,
  onEdit,
}: {
  meals: MealRecord[];
  onExtract: (mealId: string) => void;
  activeExtractionMealId: string | null;
  onEdit: (mealId: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {meals.map((meal) => {
            const extracting = activeExtractionMealId === meal.id;

            return (
              <tr key={meal.id}>
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{meal.name}</p>
                  {meal.url ? (
                    <a href={meal.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline">
                      URL
                    </a>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <ExtractionStatusPill meal={meal} />
                </td>
                <td className="px-3 py-2 text-slate-600">{new Date(meal.updatedAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => onExtract(meal.id)}
                      disabled={extracting}
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-70"
                    >
                      {extracting ? "Queueing..." : "Extract"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(meal.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MealLibraryClient({ meals, initialViewMode }: MealLibraryClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<MealLibraryViewMode>(initialViewMode);
  const [activeExtractionMealId, setActiveExtractionMealId] = useState<string | null>(null);
  const [extractionMessage, setExtractionMessage] = useState<string>("");
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editingMeal = useMemo(
    () => meals.find((meal) => meal.id === editingMealId) ?? null,
    [meals, editingMealId],
  );

  useEffect(() => {
    const persisted = window.localStorage.getItem("meal-library-view-mode");

    if (persisted === "grid" || persisted === "table") {
      setViewMode(persisted);
    }
  }, []);

  const handleViewModeChange = (nextMode: MealLibraryViewMode) => {
    setViewMode(nextMode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("meal-library-view-mode", nextMode);
    }
  };

  const handleExtract = (mealId: string) => {
    setActiveExtractionMealId(mealId);
    setExtractionMessage("");

    startTransition(async () => {
      const result = await triggerMealExtractionAction(mealId);
      setActiveExtractionMealId(null);
      setExtractionMessage(result.message ?? result.error ?? "");

      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Create meal</h2>
        <p className="mt-1 text-sm text-slate-600">Save meal fields first; AI extraction is a separate manual action.</p>
        <div className="mt-3">
          <MealEditor mode="create" onSaved={() => router.refresh()} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Meals</h2>
          <div className="inline-flex rounded-lg border border-slate-300 p-1 text-xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={`rounded-md px-3 py-1 ${viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              className={`rounded-md px-3 py-1 ${viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Table
            </button>
          </div>
        </div>

        {extractionMessage ? <p className="mt-2 text-sm text-slate-700">{extractionMessage}</p> : null}
        {isPending ? <p className="mt-1 text-xs text-slate-500">Updating...</p> : null}

        <div className="mt-3">
          {viewMode === "table" ? (
            <MealTable
              meals={meals}
              onExtract={handleExtract}
              activeExtractionMealId={activeExtractionMealId}
              onEdit={(mealId) => setEditingMealId(mealId)}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onExtract={handleExtract}
                  extracting={activeExtractionMealId === meal.id}
                  onEdit={() => setEditingMealId(meal.id)}
                />
              ))}
            </div>
          )}

          {meals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No meals yet. Add your first meal above.
            </p>
          ) : null}
        </div>
      </section>

      {editingMeal ? (
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Edit meal</h2>
          <div className="mt-3">
            <MealEditor
              mode="edit"
              meal={editingMeal}
              onDone={() => setEditingMealId(null)}
              onSaved={() => router.refresh()}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
