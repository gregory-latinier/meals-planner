-- ============================================================================
-- Migration 002: Add Recipe Image Provider
-- ============================================================================

-- 1. Create RecipeImageProvider enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipeImageProvider') THEN
    CREATE TYPE public."RecipeImageProvider" AS ENUM ('NANO_BANANA', 'FREE_PROVIDER');
  END IF;
END $$;

-- 2. Add column to Household
ALTER TABLE public."Household"
  ADD COLUMN IF NOT EXISTS "recipeImageProvider" public."RecipeImageProvider" DEFAULT 'NANO_BANANA' NOT NULL;

-- 3. Track migration in pgmigrations
INSERT INTO public.pgmigrations (name, run_on)
SELECT '002_add_recipe_image_provider', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '002_add_recipe_image_provider'
);
