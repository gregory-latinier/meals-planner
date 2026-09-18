"use server";

import { revalidatePath } from "next/cache";
import type { Meal, WeekPlan } from "@prisma/client";
import { createMealService } from "@/lib/meal-service";
import { prisma } from "@/lib/prisma";

const service = createMealService(prisma);

function weekPath(weekStart: string): string {
  return `/weeks/${weekStart}`;
}

function parseFormData(formData: FormData): { title: unknown; notes: unknown; day: unknown } {
  return {
    title: formData.get("title"),
    notes: formData.get("notes") ?? "",
    day: formData.get("day") ?? "",
  };
}

export async function getWeekPlan(weekStart: string): Promise<WeekPlan> {
  return service.getWeekPlan(weekStart);
}

export async function getWeekMeals(weekPlanId: string): Promise<Meal[]> {
  return service.getWeekMeals(weekPlanId);
}

export async function createMeal(weekPlanId: string, formData: FormData): Promise<Meal> {
  const weekPlan = await prisma.weekPlan.findUnique({
    where: { id: weekPlanId },
    select: { weekStart: true },
  });

  if (!weekPlan) {
    throw new Error("Week plan not found. Refresh and try again.");
  }

  const meal = await service.createMeal(weekPlanId, parseFormData(formData));
  revalidatePath(weekPath(weekPlan.weekStart));
  return meal;
}

export async function updateMeal(
  weekPlanId: string,
  mealId: string,
  formData: FormData,
): Promise<Meal> {
  const weekPlan = await prisma.weekPlan.findUnique({
    where: { id: weekPlanId },
    select: { weekStart: true },
  });

  if (!weekPlan) {
    throw new Error("Week plan not found. Refresh and try again.");
  }

  const meal = await service.updateMeal(weekPlanId, mealId, parseFormData(formData));
  revalidatePath(weekPath(weekPlan.weekStart));
  return meal;
}

export async function deleteMeal(weekPlanId: string, mealId: string): Promise<void> {
  const weekPlan = await prisma.weekPlan.findUnique({
    where: { id: weekPlanId },
    select: { weekStart: true },
  });

  if (!weekPlan) {
    throw new Error("Week plan not found. Refresh and try again.");
  }

  await service.deleteMeal(weekPlanId, mealId);
  revalidatePath(weekPath(weekPlan.weekStart));
}
