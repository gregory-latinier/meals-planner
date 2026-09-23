import { MealLibraryClient } from "@/components/meal-library-client";
import { getDefaultMealLibraryViewMode, listMeals } from "@/lib/meal-library-db";
import type { MealSortOption } from "@/lib/meal-library-types";
import { requireAuthenticatedPage } from "@/lib/auth-session";

type MealLibraryPageProps = {
  searchParams?: Promise<{
    q?: string;
    sort?: string;
  }>;
};

function parseSort(value: string | undefined): MealSortOption {
  switch (value) {
    case "name-asc":
    case "name-desc":
    case "created-oldest":
    case "updated-newest":
    case "updated-oldest":
    case "created-newest":
      return value;
    default:
      return "created-newest";
  }
}

export default async function MealLibraryPage({ searchParams }: MealLibraryPageProps) {
  await requireAuthenticatedPage();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = resolvedSearchParams?.q?.trim() ?? "";
  const sort = parseSort(resolvedSearchParams?.sort);
  const meals = await listMeals(search, sort);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Meal Library</h1>
        <p className="mt-2 text-sm text-slate-600">
          Save meals with recipe details and trigger ingredient extraction separately when needed.
        </p>
      </header>

      <form method="get" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <label className="block text-sm font-medium text-slate-700" htmlFor="q">
          Search name/ingredients
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="e.g. pasta, tomato, garlic"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700" htmlFor="sort">
          Sort
          <select id="sort" name="sort" defaultValue={sort} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="created-newest">Created (newest)</option>
            <option value="created-oldest">Created (oldest)</option>
            <option value="updated-newest">Updated (newest)</option>
            <option value="updated-oldest">Updated (oldest)</option>
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Apply
        </button>
      </form>

      <MealLibraryClient meals={meals} initialViewMode={getDefaultMealLibraryViewMode()} />
    </main>
  );
}
