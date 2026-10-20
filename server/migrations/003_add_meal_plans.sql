-- ============================================================================
-- Migration 003: Add Meal Plans
-- ============================================================================

-- 1. Create MealPlanItem table
CREATE TABLE IF NOT EXISTS public."MealPlanItem" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "recipeId" text REFERENCES public."Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "title" varchar(500) NOT NULL,
  "date" date,
  "weekStartDate" date NOT NULL,
  "mealType" varchar(50) DEFAULT 'dinner' NOT NULL,
  "servings" integer,
  "completed" boolean DEFAULT false NOT NULL,
  "notes" text,
  "position" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS "MealPlanItem_householdId_idx" ON public."MealPlanItem"("householdId");
CREATE INDEX IF NOT EXISTS "MealPlanItem_householdId_weekStartDate_idx" ON public."MealPlanItem"("householdId", "weekStartDate");
CREATE INDEX IF NOT EXISTS "MealPlanItem_householdId_date_idx" ON public."MealPlanItem"("householdId", "date");
CREATE INDEX IF NOT EXISTS "MealPlanItem_recipeId_idx" ON public."MealPlanItem"("recipeId");

-- 3. Track migration in pgmigrations
INSERT INTO public.pgmigrations (name, run_on)
SELECT '003_add_meal_plans', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '003_add_meal_plans'
);
