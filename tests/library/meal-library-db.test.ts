import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createMealLibraryServiceForTests } from "@/lib/meal-library-db";

describe("meal library file persistence", () => {
  let workDir: string;
  let stateFile: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "meals-planner-library-"));
    stateFile = join(workDir, "meal-library.json");
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("supports search by name + ingredient text and all required sort options", async () => {
    await writeFile(
      stateFile,
      `${JSON.stringify(
        {
          meals: [
            {
              id: "m1",
              name: "Apple Pie",
              recipe: "Apples and cinnamon",
              url: null,
              photoUrl: null,
              extractionStatus: "success",
              extractionError: null,
              extractedIngredients: [{ name: "apple" }],
              createdAt: "2026-01-01T10:00:00.000Z",
              updatedAt: "2026-01-01T12:00:00.000Z",
            },
            {
              id: "m2",
              name: "Beef Tacos",
              recipe: "Ground beef and garlic",
              url: null,
              photoUrl: null,
              extractionStatus: "pending",
              extractionError: null,
              extractedIngredients: [{ name: "beef" }, { name: "garlic" }],
              createdAt: "2026-01-02T10:00:00.000Z",
              updatedAt: "2026-01-02T14:00:00.000Z",
            },
            {
              id: "m3",
              name: "Carrot Soup",
              recipe: "Carrot and onion",
              url: null,
              photoUrl: null,
              extractionStatus: "pending",
              extractionError: null,
              extractedIngredients: [{ name: "carrot" }],
              createdAt: "2026-01-03T10:00:00.000Z",
              updatedAt: "2026-01-03T11:00:00.000Z",
            },
          ],
          extractionJobs: [],
          aiSettings: {
            geminiApiToken: "",
            models: ["gemini-1.5-flash"],
            activeModel: "gemini-1.5-flash",
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const service = createMealLibraryServiceForTests(stateFile);

    const ingredientSearch = await service.listMeals("garlic", "created-newest");
    expect(ingredientSearch).toHaveLength(1);
    expect(ingredientSearch[0].id).toBe("m2");

    const nameSearch = await service.listMeals("carrot", "created-newest");
    expect(nameSearch).toHaveLength(1);
    expect(nameSearch[0].id).toBe("m3");

    expect((await service.listMeals("", "name-asc")).map((meal) => meal.id)).toEqual(["m1", "m2", "m3"]);
    expect((await service.listMeals("", "name-desc")).map((meal) => meal.id)).toEqual(["m3", "m2", "m1"]);
    expect((await service.listMeals("", "created-newest")).map((meal) => meal.id)).toEqual(["m3", "m2", "m1"]);
    expect((await service.listMeals("", "created-oldest")).map((meal) => meal.id)).toEqual(["m1", "m2", "m3"]);
    expect((await service.listMeals("", "updated-newest")).map((meal) => meal.id)).toEqual(["m3", "m2", "m1"]);
    expect((await service.listMeals("", "updated-oldest")).map((meal) => meal.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("persists extraction status transitions independently from meal save", async () => {
    const service = createMealLibraryServiceForTests(stateFile);

    await service.createMeal({
      name: "Pesto Pasta",
      recipe: "Pasta, pesto, parmesan",
      url: "",
      photoUrl: "",
    });

    const createdMeals = await service.listMeals("", "created-newest");
    const mealId = createdMeals[0].id;

    const queued = await service.queueExtractionForMeal(mealId);
    expect(queued).toBe(true);

    const pendingMeal = await service.getMealForExtraction(mealId);
    expect(pendingMeal?.extractionStatus).toBe("pending");

    const runningJob = await service.fetchNextExtractionJob();
    expect(runningJob).not.toBeNull();
    expect(runningJob?.mealId).toBe(mealId);

    const runningMeal = await service.getMealForExtraction(mealId);
    expect(runningMeal?.extractionStatus).toBe("running");

    await service.markJobFailed(runningJob!.jobId, mealId, "Temporary provider failure.");

    const failedMeal = await service.getMealForExtraction(mealId);
    expect(failedMeal?.extractionStatus).toBe("failed");
    expect(failedMeal?.extractionError).toBe("Temporary provider failure.");

    await service.queueExtractionForMeal(mealId);
    const secondJob = await service.fetchNextExtractionJob();
    expect(secondJob).not.toBeNull();

    await service.markJobSuccess(secondJob!.jobId, mealId, [
      { name: "pasta", amountPerServing: "120g" },
      { name: "pesto" },
    ]);

    const successMeal = await service.getMealForExtraction(mealId);
    expect(successMeal?.extractionStatus).toBe("success");
    expect(successMeal?.extractionError).toBeNull();
    expect(successMeal?.extractedIngredients).toEqual([
      { name: "pasta", amountPerServing: "120g" },
      { name: "pesto" },
    ]);

    const persisted = JSON.parse(await readFile(stateFile, "utf8")) as {
      extractionJobs: Array<{ status: string }>;
    };
    expect(persisted.extractionJobs.some((job) => job.status === "failed")).toBe(true);
    expect(persisted.extractionJobs.some((job) => job.status === "success")).toBe(true);
  });
});
