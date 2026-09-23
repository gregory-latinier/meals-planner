export type ExtractionStatus = "pending" | "running" | "success" | "failed";

export type MealSortOption =
  | "name-asc"
  | "name-desc"
  | "created-newest"
  | "created-oldest"
  | "updated-newest"
  | "updated-oldest";

export type MealLibraryViewMode = "grid" | "table";

export type ExtractedIngredient = {
  name: string;
  amountPerServing?: string;
  notes?: string;
};

export type MealRecord = {
  id: string;
  name: string;
  recipe: string;
  url: string | null;
  photoUrl: string | null;
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
  extractedIngredients: ExtractedIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type AiSettings = {
  geminiApiToken: string;
  models: string[];
  activeModel: string;
};

export type MealExtractionJob = {
  id: string;
  mealId: string;
  status: ExtractionStatus;
  attempts: number;
  lastError: string | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type MealLibraryState = {
  meals: MealRecord[];
  extractionJobs: MealExtractionJob[];
  aiSettings: AiSettings;
};
