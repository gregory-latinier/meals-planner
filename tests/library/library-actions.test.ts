import { beforeEach, describe, expect, it, vi } from "vitest";

const createMealMock = vi.fn();
const updateMealMock = vi.fn();
const queueExtractionForMealMock = vi.fn();
const triggerExtractionRunnerMock = vi.fn();
const revalidatePathMock = vi.fn();
const requireAuthenticatedActionMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/meal-library-db", () => ({
  createMeal: createMealMock,
  updateMeal: updateMealMock,
  queueExtractionForMeal: queueExtractionForMealMock,
}));

vi.mock("@/lib/meal-extraction-runner", () => ({
  triggerExtractionRunner: triggerExtractionRunnerMock,
}));

vi.mock("@/lib/auth-session", () => ({
  requireAuthenticatedAction: requireAuthenticatedActionMock,
}));

describe("library server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedActionMock.mockResolvedValue(null);
  });

  it("validates create meal input", async () => {
    const module = await import("@/app/library/actions");

    const formData = new FormData();
    formData.set("recipe", "Some recipe");

    const result = await module.createMealAction(module.initialMealActionState, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/name is required/i);
    expect(createMealMock).not.toHaveBeenCalled();
  });

  it("returns clear not-found error when update target no longer exists", async () => {
    updateMealMock.mockResolvedValue(false);

    const module = await import("@/app/library/actions");

    const formData = new FormData();
    formData.set("mealId", "missing");
    formData.set("name", "Soup");
    formData.set("recipe", "Water and veggies");

    const result = await module.updateMealAction(module.initialMealActionState, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("enqueues extraction and returns immediately", async () => {
    queueExtractionForMealMock.mockResolvedValue(true);

    const module = await import("@/app/library/actions");
    const result = await module.triggerMealExtractionAction("meal-1");

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/queued/i);
    expect(triggerExtractionRunnerMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/library");
  });

  it("returns actionable error when extraction queue target is missing", async () => {
    queueExtractionForMealMock.mockResolvedValue(false);

    const module = await import("@/app/library/actions");
    const result = await module.triggerMealExtractionAction("missing");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(triggerExtractionRunnerMock).not.toHaveBeenCalled();
  });

  it("returns auth error when unauthenticated", async () => {
    requireAuthenticatedActionMock.mockResolvedValue({
      ok: false,
      error: "Authentication required. Sign in at /login and retry.",
    });

    const module = await import("@/app/library/actions");
    const formData = new FormData();
    formData.set("name", "Soup");
    formData.set("recipe", "Water");

    const result = await module.createMealAction(module.initialMealActionState, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/authentication required/i);
    expect(createMealMock).not.toHaveBeenCalled();
  });
});
