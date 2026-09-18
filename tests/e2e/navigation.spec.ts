import { test, expect } from "@playwright/test";

test("top navigation allows switching between weekly plan and history", async ({ page }) => {
  await page.goto("/weeks/2026-09-14");

  await expect(page.getByRole("heading", { name: "Weekly Meal Plan" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "History" })
    .click();
  await expect(page).toHaveURL(/\/history\/\d{4}-\d{2}$/);
  await expect(page.getByRole("heading", { name: "Meal History" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Weekly plan" })
    .click();
  await expect(page).toHaveURL(/\/weeks\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole("heading", { name: "Weekly Meal Plan" })).toBeVisible();
});

test("history page renders mobile-friendly day list section", async ({ page }) => {
  await page.goto("/history/2026-09");

  await expect(page.getByRole("heading", { name: "Meal History" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "History" })).toBeVisible();
});
