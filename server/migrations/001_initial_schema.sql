-- ============================================================================
-- Migration 001: Initial Schema
-- ============================================================================

-- 1. Household table
CREATE TABLE IF NOT EXISTS public."Household" (
  "id" text NOT NULL PRIMARY KEY,
  "passwordHash" text NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);

-- 2. Session table
CREATE TABLE IF NOT EXISTS public."Session" (
  "id" text NOT NULL PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON public."Session"("token");
CREATE INDEX IF NOT EXISTS "Session_householdId_idx" ON public."Session"("householdId");

-- 3. PasswordResetToken table
CREATE TABLE IF NOT EXISTS public."PasswordResetToken" (
  "id" text NOT NULL PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" timestamp(3) NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON public."PasswordResetToken"("token");

-- 4. Cookbook table
CREATE TABLE IF NOT EXISTS public."Cookbook" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" varchar(500) NOT NULL,
  "nameNormalized" varchar(500) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Cookbook_householdId_nameNormalized_key" UNIQUE ("householdId", "nameNormalized")
);
CREATE INDEX IF NOT EXISTS "Cookbook_householdId_idx" ON public."Cookbook"("householdId");
CREATE INDEX IF NOT EXISTS "Cookbook_updatedAt_idx" ON public."Cookbook"("updatedAt");

-- 5. Store table
CREATE TABLE IF NOT EXISTS public."Store" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" varchar(500) NOT NULL,
  "nameNormalized" varchar(500) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Store_householdId_nameNormalized_key" UNIQUE ("householdId", "nameNormalized")
);
CREATE INDEX IF NOT EXISTS "Store_householdId_idx" ON public."Store"("householdId");
CREATE INDEX IF NOT EXISTS "Store_updatedAt_idx" ON public."Store"("updatedAt");

-- 6. Enums for Recipes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipeStatus') THEN
    CREATE TYPE public."RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipeIngredientRowKind') THEN
    CREATE TYPE public."RecipeIngredientRowKind" AS ENUM ('HEADING', 'ITEM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipeExtractionModel') THEN
    CREATE TYPE public."RecipeExtractionModel" AS ENUM ('GEMINI_FREE');
  END IF;
END $$;

-- 7. Add AI extraction & Gemini columns to Household
ALTER TABLE public."Household"
  ADD COLUMN IF NOT EXISTS "recipeExtractionModel" public."RecipeExtractionModel" DEFAULT 'GEMINI_FREE' NOT NULL,
  ADD COLUMN IF NOT EXISTS "geminiApiKeyEncrypted" text,
  ADD COLUMN IF NOT EXISTS "geminiApiKeyMasked" varchar(32),
  ADD COLUMN IF NOT EXISTS "geminiApiKeyUpdatedAt" timestamp(3);

-- 8. Recipe table
CREATE TABLE IF NOT EXISTS public."Recipe" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "cookbookId" text REFERENCES public."Cookbook"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "title" varchar(500) NOT NULL,
  "status" public."RecipeStatus" DEFAULT 'DRAFT' NOT NULL,
  "servings" integer,
  "prepMinutes" integer,
  "cookMinutes" integer,
  "sourceUrl" text,
  "instructions" jsonb NOT NULL,
  "imagePath" varchar(1024),
  "imageMimeType" varchar(100),
  "imageWidth" integer,
  "imageHeight" integer,
  "imageSizeBytes" integer,
  "draftSavedAt" timestamp(3),
  "lastAutosavedAt" timestamp(3),
  "autosaveVersion" integer DEFAULT 0 NOT NULL,
  "publishedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "Recipe_householdId_updatedAt_idx" ON public."Recipe"("householdId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Recipe_householdId_status_updatedAt_idx" ON public."Recipe"("householdId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Recipe_cookbookId_idx" ON public."Recipe"("cookbookId");

-- 9. RecipeTag table
CREATE TABLE IF NOT EXISTS public."RecipeTag" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" varchar(100) NOT NULL,
  "nameNormalized" varchar(100) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "RecipeTag_householdId_nameNormalized_key" UNIQUE ("householdId", "nameNormalized")
);
CREATE INDEX IF NOT EXISTS "RecipeTag_householdId_idx" ON public."RecipeTag"("householdId");
CREATE INDEX IF NOT EXISTS "RecipeTag_householdId_name_idx" ON public."RecipeTag"("householdId", "name");

-- 10. RecipeTagOnRecipe table
CREATE TABLE IF NOT EXISTS public."RecipeTagOnRecipe" (
  "recipeId" text NOT NULL REFERENCES public."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tagId" text NOT NULL REFERENCES public."RecipeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "RecipeTagOnRecipe_pkey" PRIMARY KEY ("recipeId", "tagId")
);
CREATE INDEX IF NOT EXISTS "RecipeTagOnRecipe_tagId_idx" ON public."RecipeTagOnRecipe"("tagId");

-- 11. Ingredient table
CREATE TABLE IF NOT EXISTS public."Ingredient" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" varchar(300) NOT NULL,
  "nameNormalized" varchar(300) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Ingredient_householdId_nameNormalized_key" UNIQUE ("householdId", "nameNormalized")
);
CREATE INDEX IF NOT EXISTS "Ingredient_householdId_idx" ON public."Ingredient"("householdId");
CREATE INDEX IF NOT EXISTS "Ingredient_householdId_name_idx" ON public."Ingredient"("householdId", "name");

-- 12. IngredientTranslation table
CREATE TABLE IF NOT EXISTS public."IngredientTranslation" (
  "id" text NOT NULL PRIMARY KEY,
  "ingredientId" text NOT NULL REFERENCES public."Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "locale" varchar(8) NOT NULL,
  "name" varchar(300) NOT NULL,
  "nameNormalized" varchar(300) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "IngredientTranslation_ingredientId_locale_key" UNIQUE ("ingredientId", "locale")
);
CREATE INDEX IF NOT EXISTS "IngredientTranslation_locale_nameNormalized_idx" ON public."IngredientTranslation"("locale", "nameNormalized");

-- 13. Unit table
CREATE TABLE IF NOT EXISTS public."Unit" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" varchar(100) NOT NULL,
  "nameNormalized" varchar(100) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Unit_householdId_nameNormalized_key" UNIQUE ("householdId", "nameNormalized")
);
CREATE INDEX IF NOT EXISTS "Unit_householdId_idx" ON public."Unit"("householdId");
CREATE INDEX IF NOT EXISTS "Unit_householdId_name_idx" ON public."Unit"("householdId", "name");

-- 14. RecipeIngredientRow table
CREATE TABLE IF NOT EXISTS public."RecipeIngredientRow" (
  "id" text NOT NULL PRIMARY KEY,
  "recipeId" text NOT NULL REFERENCES public."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "position" integer NOT NULL,
  "kind" public."RecipeIngredientRowKind" NOT NULL,
  "heading" varchar(500),
  "ingredientId" text REFERENCES public."Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "quantity" varchar(100),
  "unitId" text REFERENCES public."Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "note" varchar(500),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "RecipeIngredientRow_recipeId_position_idx" ON public."RecipeIngredientRow"("recipeId", "position");
CREATE INDEX IF NOT EXISTS "RecipeIngredientRow_ingredientId_idx" ON public."RecipeIngredientRow"("ingredientId");
CREATE INDEX IF NOT EXISTS "RecipeIngredientRow_unitId_idx" ON public."RecipeIngredientRow"("unitId");

-- 15. Track migration in pgmigrations
INSERT INTO public.pgmigrations (name, run_on)
SELECT '001_initial_schema', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '001_initial_schema'
);
