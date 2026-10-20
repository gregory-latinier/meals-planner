-- ============================================================================
-- Migration 004: Add Household Preferences
-- ============================================================================

-- 1. Create HouseholdPreferences table
CREATE TABLE IF NOT EXISTS public."HouseholdPreferences" (
  "householdId" text NOT NULL PRIMARY KEY REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "defaultMealPlanServings" integer DEFAULT 4 NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Add constraint for positive servings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_default_meal_plan_servings_positive'
  ) THEN
    ALTER TABLE public."HouseholdPreferences"
      ADD CONSTRAINT check_default_meal_plan_servings_positive
      CHECK ("defaultMealPlanServings" > 0);
  END IF;
END $$;

-- 3. Track migration in pgmigrations
INSERT INTO public.pgmigrations (name, run_on)
SELECT '004_add_household_preferences', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '004_add_household_preferences'
);
