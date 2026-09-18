import type { Prisma, PrismaClient } from "@prisma/client";
import { isWeekDay } from "@/lib/day";

const mealFormSchema = {
  title(value: unknown): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("Meal name is required.");
    }

    const trimmed = value.trim();
    if (trimmed.length > 120) {
      throw new Error("Meal name is too long (max 120 characters).");
    }

    return trimmed;
  },
  notes(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length > 1000) {
      throw new Error("Notes are too long (max 1000 characters).");
    }

    return trimmed.length > 0 ? trimmed : null;
  },
  day(value: unknown): Prisma.MealCreateInput["day"] {
    if (typeof value !== "string" || value.trim().length === 0) {
      return null;
    }

    const normalized = value.trim();
    if (!isWeekDay(normalized)) {
      throw new Error("Day must be one of Monday to Sunday, or left unassigned.");
    }

    return normalized;
  },
};

type MealInput = {
  title: string;
  notes: string | null;
  day: Prisma.MealCreateInput["day"];
};

function toMealInput(raw: { title: unknown; notes: unknown; day: unknown }): MealInput {
  return {
    title: mealFormSchema.title(raw.title),
    notes: mealFormSchema.notes(raw.notes),
    day: mealFormSchema.day(raw.day),
  };
}

type DbClient = Pick<PrismaClient, "weekPlan" | "meal">;

export function createMealService(db: DbClient) {
  return {
    async getWeekPlan(weekStart: string) {
      return db.weekPlan.upsert({
        where: { weekStart },
        update: {},
        create: { weekStart },
      });
    },

    async getWeekMeals(weekPlanId: string) {
      return db.meal.findMany({
        where: { weekPlanId },
        orderBy: [{ createdAt: "asc" }],
      });
    },

    async getWeekPlansWithMealsInRange(startWeekStart: string, endWeekStart: string) {
      return db.weekPlan.findMany({
        where: {
          weekStart: {
            gte: startWeekStart,
            lte: endWeekStart,
          },
        },
        include: {
          meals: {
            orderBy: [{ createdAt: "asc" }],
          },
        },
        orderBy: [{ weekStart: "desc" }],
      });
    },

    async createMeal(weekPlanId: string, rawInput: { title: unknown; notes: unknown; day: unknown }) {
      const input = toMealInput(rawInput);

      const weekPlan = await db.weekPlan.findUnique({
        where: { id: weekPlanId },
        select: { id: true },
      });

      if (!weekPlan) {
        throw new Error("Week plan not found. Refresh and try again.");
      }

      return db.meal.create({
        data: {
          weekPlanId,
          title: input.title,
          notes: input.notes,
          day: input.day,
        },
      });
    },

    async updateMeal(
      weekPlanId: string,
      mealId: string,
      rawInput: { title: unknown; notes: unknown; day: unknown },
    ) {
      const input = toMealInput(rawInput);

      const meal = await db.meal.findUnique({
        where: { id: mealId },
        select: { id: true, weekPlanId: true },
      });

      if (!meal || meal.weekPlanId !== weekPlanId) {
        throw new Error("Meal not found in this week plan.");
      }

      return db.meal.update({
        where: { id: mealId },
        data: {
          title: input.title,
          notes: input.notes,
          day: input.day,
        },
      });
    },

    async deleteMeal(weekPlanId: string, mealId: string) {
      const meal = await db.meal.findUnique({
        where: { id: mealId },
        select: { id: true, weekPlanId: true },
      });

      if (!meal || meal.weekPlanId !== weekPlanId) {
        throw new Error("Meal not found in this week plan.");
      }

      await db.meal.delete({ where: { id: mealId } });
    },
  };
}
