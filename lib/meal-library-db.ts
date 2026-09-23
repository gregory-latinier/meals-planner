import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AiSettings,
  ExtractedIngredient,
  MealExtractionJob,
  MealLibraryState,
  MealLibraryViewMode,
  MealRecord,
  MealSortOption,
} from "@/lib/meal-library-types";

const DEFAULT_LIBRARY_STATE_FILE = ".data/meal-library.json";
const STATE_FILE_BACKUP_SUFFIX = ".bak";
const STATE_FILE_TEMP_SUFFIX = ".tmp";
const DEFAULT_MODELS = ["gemini-1.5-flash"];

const DEFAULT_AI_SETTINGS: AiSettings = {
  geminiApiToken: "",
  models: [...DEFAULT_MODELS],
  activeModel: DEFAULT_MODELS[0],
};

const DEFAULT_LIBRARY_STATE: MealLibraryState = {
  meals: [],
  extractionJobs: [],
  aiSettings: DEFAULT_AI_SETTINGS,
};

function getStateFilePath(): string {
  return resolve(process.cwd(), process.env.MEAL_LIBRARY_STATE_FILE ?? DEFAULT_LIBRARY_STATE_FILE);
}

function getBackupStateFilePath(stateFilePath: string): string {
  return `${stateFilePath}${STATE_FILE_BACKUP_SUFFIX}`;
}

function getTempStateFilePath(stateFilePath: string): string {
  return `${stateFilePath}${STATE_FILE_TEMP_SUFFIX}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeIngredients(value: unknown): ExtractedIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }

      const candidate = entry as Record<string, unknown>;

      if (typeof candidate.name !== "string") {
        return undefined;
      }

      const name = candidate.name.trim();

      if (!name) {
        return undefined;
      }

      const ingredient: ExtractedIngredient = {
        name,
      };

      const amountPerServing = toNullableString(candidate.amountPerServing);
      const notes = toNullableString(candidate.notes);

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

function sanitizeStatus(value: unknown): MealRecord["extractionStatus"] {
  if (value === "pending" || value === "running" || value === "success" || value === "failed") {
    return value;
  }

  return "pending";
}

function sanitizeMeal(value: unknown): MealRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== "string") {
    return undefined;
  }

  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const recipe = typeof candidate.recipe === "string" ? candidate.recipe.trim() : "";

  if (!name || !recipe) {
    return undefined;
  }

  const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : nowIso();
  const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt;

  return {
    id: candidate.id,
    name,
    recipe,
    url: toNullableString(candidate.url),
    photoUrl: toNullableString(candidate.photoUrl),
    extractionStatus: sanitizeStatus(candidate.extractionStatus),
    extractionError: toNullableString(candidate.extractionError),
    extractedIngredients: sanitizeIngredients(candidate.extractedIngredients),
    createdAt,
    updatedAt,
  };
}

function sanitizeJobStatus(value: unknown): MealExtractionJob["status"] {
  if (value === "pending" || value === "running" || value === "success" || value === "failed") {
    return value;
  }

  return "pending";
}

function sanitizeJob(value: unknown): MealExtractionJob | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== "string" || typeof candidate.mealId !== "string") {
    return undefined;
  }

  return {
    id: candidate.id,
    mealId: candidate.mealId,
    status: sanitizeJobStatus(candidate.status),
    attempts: typeof candidate.attempts === "number" && Number.isFinite(candidate.attempts) ? candidate.attempts : 0,
    lastError: toNullableString(candidate.lastError),
    queuedAt: typeof candidate.queuedAt === "string" ? candidate.queuedAt : nowIso(),
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : null,
    finishedAt: typeof candidate.finishedAt === "string" ? candidate.finishedAt : null,
  };
}

function sanitizeModels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_MODELS];
  }

  const models = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (models.length === 0) {
    return [...DEFAULT_MODELS];
  }

  return Array.from(new Set(models));
}

function sanitizeAiSettings(value: unknown): AiSettings {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_AI_SETTINGS,
      models: [...DEFAULT_AI_SETTINGS.models],
    };
  }

  const candidate = value as Record<string, unknown>;
  const models = sanitizeModels(candidate.models);
  const activeModelCandidate = typeof candidate.activeModel === "string" ? candidate.activeModel.trim() : "";

  return {
    geminiApiToken: typeof candidate.geminiApiToken === "string" ? candidate.geminiApiToken.trim() : "",
    models,
    activeModel: models.includes(activeModelCandidate) ? activeModelCandidate : models[0],
  };
}

function sanitizeState(value: unknown): MealLibraryState {
  if (!value || typeof value !== "object") {
    return {
      meals: [],
      extractionJobs: [],
      aiSettings: {
        ...DEFAULT_AI_SETTINGS,
        models: [...DEFAULT_AI_SETTINGS.models],
      },
    };
  }

  const candidate = value as Record<string, unknown>;

  return {
    meals: Array.isArray(candidate.meals)
      ? candidate.meals.map((entry) => sanitizeMeal(entry)).filter((entry): entry is MealRecord => entry !== undefined)
      : [],
    extractionJobs: Array.isArray(candidate.extractionJobs)
      ? candidate.extractionJobs.map((entry) => sanitizeJob(entry)).filter((entry): entry is MealExtractionJob => entry !== undefined)
      : [],
    aiSettings: sanitizeAiSettings(candidate.aiSettings),
  };
}

function cloneState(state: MealLibraryState): MealLibraryState {
  return {
    meals: state.meals.map((meal) => ({
      ...meal,
      extractedIngredients: meal.extractedIngredients.map((ingredient) => ({ ...ingredient })),
    })),
    extractionJobs: state.extractionJobs.map((job) => ({ ...job })),
    aiSettings: {
      ...state.aiSettings,
      models: [...state.aiSettings.models],
    },
  };
}

function compareIsoAsc(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareIsoDesc(left: string, right: string): number {
  return right.localeCompare(left);
}

function compareNameAsc(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortMeals(meals: MealRecord[], sort: MealSortOption): MealRecord[] {
  const sorted = [...meals];

  sorted.sort((left, right) => {
    switch (sort) {
      case "name-asc": {
        const byName = compareNameAsc(left.name, right.name);
        return byName !== 0 ? byName : compareIsoDesc(left.createdAt, right.createdAt);
      }
      case "name-desc": {
        const byName = compareNameAsc(right.name, left.name);
        return byName !== 0 ? byName : compareIsoDesc(left.createdAt, right.createdAt);
      }
      case "created-oldest":
        return compareIsoAsc(left.createdAt, right.createdAt);
      case "updated-newest":
        return compareIsoDesc(left.updatedAt, right.updatedAt);
      case "updated-oldest":
        return compareIsoAsc(left.updatedAt, right.updatedAt);
      case "created-newest":
      default:
        return compareIsoDesc(left.createdAt, right.createdAt);
    }
  });

  return sorted;
}

function mealMatchesSearch(meal: MealRecord, term: string): boolean {
  if (!term) {
    return true;
  }

  const normalizedTerm = term.toLowerCase();
  const haystacks = [
    meal.name,
    meal.recipe,
    ...meal.extractedIngredients.map((ingredient) => ingredient.name),
    ...meal.extractedIngredients
      .map((ingredient) => ingredient.notes)
      .filter((notes): notes is string => typeof notes === "string"),
  ];

  return haystacks.some((value) => value.toLowerCase().includes(normalizedTerm));
}

class MealLibraryService {
  private mutationLock: Promise<void> = Promise.resolve();

  constructor(private readonly stateFilePath: string) {}

  async listMeals(search: string, sort: MealSortOption): Promise<MealRecord[]> {
    const state = await this.readState();
    const term = search.trim().toLowerCase();

    return sortMeals(
      state.meals
        .filter((meal) => mealMatchesSearch(meal, term))
        .map((meal) => ({
          ...meal,
          extractedIngredients: meal.extractedIngredients.map((ingredient) => ({ ...ingredient })),
        })),
      sort,
    );
  }

  async createMeal(input: {
    name: string;
    recipe: string;
    url?: string;
    photoUrl?: string;
  }): Promise<void> {
    await this.withMutationLock(async () => {
      const state = await this.readState();
      const timestamp = nowIso();

      state.meals.push({
        id: randomUUID(),
        name: input.name.trim(),
        recipe: input.recipe.trim(),
        url: toNullableString(input.url),
        photoUrl: toNullableString(input.photoUrl),
        extractionStatus: "pending",
        extractionError: null,
        extractedIngredients: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await this.writeState(state);
    });
  }

  async updateMeal(
    id: string,
    input: {
      name: string;
      recipe: string;
      url?: string;
      photoUrl?: string;
    },
  ): Promise<boolean> {
    return this.withMutationLock(async () => {
      const state = await this.readState();
      const meal = state.meals.find((entry) => entry.id === id);

      if (!meal) {
        return false;
      }

      meal.name = input.name.trim();
      meal.recipe = input.recipe.trim();
      meal.url = toNullableString(input.url);
      meal.photoUrl = toNullableString(input.photoUrl);
      meal.updatedAt = nowIso();

      await this.writeState(state);
      return true;
    });
  }

  async queueExtractionForMeal(mealId: string): Promise<boolean> {
    return this.withMutationLock(async () => {
      const state = await this.readState();
      const meal = state.meals.find((entry) => entry.id === mealId);

      if (!meal) {
        return false;
      }

      meal.extractionStatus = "pending";
      meal.extractionError = null;
      meal.updatedAt = nowIso();

      state.extractionJobs.push({
        id: randomUUID(),
        mealId,
        status: "pending",
        attempts: 0,
        lastError: null,
        queuedAt: nowIso(),
        startedAt: null,
        finishedAt: null,
      });

      await this.writeState(state);
      return true;
    });
  }

  async fetchNextExtractionJob(): Promise<{ jobId: string; mealId: string } | null> {
    return this.withMutationLock(async () => {
      const state = await this.readState();
      const nextPending = [...state.extractionJobs]
        .filter((job) => job.status === "pending")
        .sort((left, right) => compareIsoAsc(left.queuedAt, right.queuedAt))[0];

      if (!nextPending) {
        return null;
      }

      const meal = state.meals.find((entry) => entry.id === nextPending.mealId);
      nextPending.status = "running";
      nextPending.attempts += 1;
      nextPending.startedAt = nowIso();
      nextPending.finishedAt = null;
      nextPending.lastError = null;

      if (meal) {
        meal.extractionStatus = "running";
        meal.extractionError = null;
        meal.updatedAt = nowIso();
      }

      await this.writeState(state);

      return {
        jobId: nextPending.id,
        mealId: nextPending.mealId,
      };
    });
  }

  async getMealForExtraction(mealId: string): Promise<MealRecord | null> {
    const state = await this.readState();
    const meal = state.meals.find((entry) => entry.id === mealId);

    if (!meal) {
      return null;
    }

    return {
      ...meal,
      extractedIngredients: meal.extractedIngredients.map((ingredient) => ({ ...ingredient })),
    };
  }

  async markJobSuccess(jobId: string, mealId: string, ingredients: ExtractedIngredient[]): Promise<void> {
    await this.withMutationLock(async () => {
      const state = await this.readState();
      const job = state.extractionJobs.find((entry) => entry.id === jobId && entry.mealId === mealId);
      const meal = state.meals.find((entry) => entry.id === mealId);

      if (job) {
        job.status = "success";
        job.finishedAt = nowIso();
        job.lastError = null;
      }

      if (meal) {
        meal.extractionStatus = "success";
        meal.extractionError = null;
        meal.extractedIngredients = ingredients.map((ingredient) => ({ ...ingredient }));
        meal.updatedAt = nowIso();
      }

      await this.writeState(state);
    });
  }

  async markJobFailed(jobId: string, mealId: string, errorMessage: string): Promise<void> {
    await this.withMutationLock(async () => {
      const state = await this.readState();
      const job = state.extractionJobs.find((entry) => entry.id === jobId && entry.mealId === mealId);
      const meal = state.meals.find((entry) => entry.id === mealId);

      if (job) {
        job.status = "failed";
        job.lastError = errorMessage;
        job.finishedAt = nowIso();
      }

      if (meal) {
        meal.extractionStatus = "failed";
        meal.extractionError = errorMessage;
        meal.updatedAt = nowIso();
      }

      await this.writeState(state);
    });
  }

  async getAiSettings(): Promise<AiSettings> {
    const state = await this.readState();

    return {
      geminiApiToken: state.aiSettings.geminiApiToken,
      models: [...state.aiSettings.models],
      activeModel: state.aiSettings.activeModel,
    };
  }

  async saveAiSettings(input: AiSettings): Promise<void> {
    await this.withMutationLock(async () => {
      const state = await this.readState();
      const models = sanitizeModels(input.models);
      const activeModel = models.includes(input.activeModel) ? input.activeModel : models[0];

      state.aiSettings = {
        geminiApiToken: input.geminiApiToken.trim(),
        models,
        activeModel,
      };

      await this.writeState(state);
    });
  }

  private async readState(): Promise<MealLibraryState> {
    const primary = await this.readStateFile(this.stateFilePath);

    if (primary) {
      return primary;
    }

    const backup = await this.readStateFile(getBackupStateFilePath(this.stateFilePath));

    if (backup) {
      return backup;
    }

    return cloneState(DEFAULT_LIBRARY_STATE);
  }

  private async readStateFile(path: string): Promise<MealLibraryState | null> {
    try {
      const fileContent = await readFile(path, "utf8");
      return sanitizeState(JSON.parse(fileContent));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "ENOENT"
      ) {
        return null;
      }

      return null;
    }
  }

  private async writeState(state: MealLibraryState): Promise<void> {
    await mkdir(dirname(this.stateFilePath), { recursive: true });

    const tempFilePath = getTempStateFilePath(this.stateFilePath);

    await writeFile(tempFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tempFilePath, this.stateFilePath);
    await copyFile(this.stateFilePath, getBackupStateFilePath(this.stateFilePath));
  }

  private async withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
    const waitForPrevious = this.mutationLock;
    let releaseLock: (() => void) | undefined;

    this.mutationLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await waitForPrevious;

    try {
      return await operation();
    } finally {
      releaseLock?.();
    }
  }
}

const mealLibraryService = new MealLibraryService(getStateFilePath());

export async function listMeals(search: string, sort: MealSortOption): Promise<MealRecord[]> {
  return mealLibraryService.listMeals(search, sort);
}

export async function createMeal(input: {
  name: string;
  recipe: string;
  url?: string;
  photoUrl?: string;
}): Promise<void> {
  return mealLibraryService.createMeal(input);
}

export async function updateMeal(
  id: string,
  input: {
    name: string;
    recipe: string;
    url?: string;
    photoUrl?: string;
  },
): Promise<boolean> {
  return mealLibraryService.updateMeal(id, input);
}

export async function queueExtractionForMeal(mealId: string): Promise<boolean> {
  return mealLibraryService.queueExtractionForMeal(mealId);
}

export async function fetchNextExtractionJob(): Promise<{ jobId: string; mealId: string } | null> {
  return mealLibraryService.fetchNextExtractionJob();
}

export async function getMealForExtraction(mealId: string): Promise<MealRecord | null> {
  return mealLibraryService.getMealForExtraction(mealId);
}

export async function markJobSuccess(jobId: string, mealId: string, ingredients: ExtractedIngredient[]): Promise<void> {
  return mealLibraryService.markJobSuccess(jobId, mealId, ingredients);
}

export async function markJobFailed(jobId: string, mealId: string, errorMessage: string): Promise<void> {
  return mealLibraryService.markJobFailed(jobId, mealId, errorMessage);
}

export async function getAiSettings(): Promise<AiSettings> {
  return mealLibraryService.getAiSettings();
}

export async function saveAiSettings(input: AiSettings): Promise<void> {
  return mealLibraryService.saveAiSettings(input);
}

export function getDefaultMealLibraryViewMode(): MealLibraryViewMode {
  return "grid";
}

export function createMealLibraryServiceForTests(stateFilePath: string) {
  return new MealLibraryService(stateFilePath);
}

export const __testables = {
  mealMatchesSearch,
  sortMeals,
  sanitizeModels,
  sanitizeIngredients,
};
