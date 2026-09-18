import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { PrismaClient } from "../prisma/generated/test-client";
import { createMealService } from "@/lib/meal-service";

const prisma = new PrismaClient();
const service = createMealService(prisma as unknown as Parameters<typeof createMealService>[0]);

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.meal.deleteMany();
  await prisma.weekPlan.deleteMany();
});

describe("meal service CRUD", () => {
  test("creates meal without day (unassigned)", async () => {
    const week = await service.getWeekPlan("2026-09-14");

    const meal = await service.createMeal(week.id, {
      title: "Pasta",
      notes: "",
      day: "",
    });

    expect(meal.day).toBeNull();
    expect(meal.title).toBe("Pasta");
  });

  test("assigns and unassigns day on update", async () => {
    const week = await service.getWeekPlan("2026-09-14");
    const meal = await service.createMeal(week.id, {
      title: "Tacos",
      notes: "Family dinner",
      day: "MONDAY",
    });

    const reassigned = await service.updateMeal(week.id, meal.id, {
      title: "Tacos",
      notes: "Family dinner",
      day: "WEDNESDAY",
    });

    expect(reassigned.day).toBe("WEDNESDAY");

    const unassigned = await service.updateMeal(week.id, meal.id, {
      title: "Tacos",
      notes: "Family dinner",
      day: "",
    });

    expect(unassigned.day).toBeNull();
  });

  test("deletes meal", async () => {
    const week = await service.getWeekPlan("2026-09-14");
    const meal = await service.createMeal(week.id, {
      title: "Salad",
      notes: "",
      day: "FRIDAY",
    });

    await service.deleteMeal(week.id, meal.id);

    const meals = await service.getWeekMeals(week.id);
    expect(meals).toHaveLength(0);
  });

  test("rejects invalid day values", async () => {
    const week = await service.getWeekPlan("2026-09-14");

    await expect(
      service.createMeal(week.id, {
        title: "Soup",
        notes: "",
        day: "FUNDAY",
      }),
    ).rejects.toThrow("Day must be one of Monday to Sunday, or left unassigned.");
  });

  test("rejects empty meal title", async () => {
    const week = await service.getWeekPlan("2026-09-14");

    await expect(
      service.createMeal(week.id, {
        title: "   ",
        notes: "Some note",
        day: "MONDAY",
      }),
    ).rejects.toThrow("Meal name is required.");
  });

  test("rejects creating a meal for missing week plan", async () => {
    await expect(
      service.createMeal("missing-week-plan", {
        title: "Pancakes",
        notes: "",
        day: "SATURDAY",
      }),
    ).rejects.toThrow("Week plan not found. Refresh and try again.");
  });
});
