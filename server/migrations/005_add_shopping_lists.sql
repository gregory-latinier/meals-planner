-- ============================================================================
-- Migration 005: Add Shopping Lists
-- ============================================================================

-- 1. Add alwaysInStock column to Ingredient
ALTER TABLE public."Ingredient"
  ADD COLUMN IF NOT EXISTS "alwaysInStock" boolean DEFAULT false NOT NULL;

-- 2. Create Enums for Shopping Lists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShoppingListStatus') THEN
    CREATE TYPE public."ShoppingListStatus" AS ENUM ('ACTIVE', 'COMPLETED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShoppingListItemSource') THEN
    CREATE TYPE public."ShoppingListItemSource" AS ENUM ('RECIPE', 'MANUAL');
  END IF;
END $$;

-- 3. Create ShoppingList table
CREATE TABLE IF NOT EXISTS public."ShoppingList" (
  "id" text NOT NULL PRIMARY KEY,
  "householdId" text NOT NULL REFERENCES public."Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" public."ShoppingListStatus" DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "completedAt" timestamp(3)
);
CREATE INDEX IF NOT EXISTS "ShoppingList_householdId_createdAt_idx" ON public."ShoppingList"("householdId", "createdAt");

-- At most one active list per household
CREATE UNIQUE INDEX IF NOT EXISTS "ShoppingList_one_active_per_household"
  ON public."ShoppingList"("householdId")
  WHERE ("status" = 'ACTIVE');

-- 4. Create ShoppingListItem table
CREATE TABLE IF NOT EXISTS public."ShoppingListItem" (
  "id" text NOT NULL PRIMARY KEY,
  "listId" text NOT NULL REFERENCES public."ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" text REFERENCES public."Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "name" varchar(300) NOT NULL,
  "nameNormalized" varchar(300) NOT NULL,
  "quantities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "quantityText" varchar(200),
  "storeId" text REFERENCES public."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "source" public."ShoppingListItemSource" DEFAULT 'MANUAL' NOT NULL,
  "pantryCheck" boolean DEFAULT false NOT NULL,
  "checked" boolean DEFAULT false NOT NULL,
  "checkedAt" timestamp(3),
  "position" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "ShoppingListItem_listId_idx" ON public."ShoppingListItem"("listId");
CREATE INDEX IF NOT EXISTS "ShoppingListItem_ingredientId_idx" ON public."ShoppingListItem"("ingredientId");
CREATE INDEX IF NOT EXISTS "ShoppingListItem_storeId_idx" ON public."ShoppingListItem"("storeId");

-- 5. Create ShoppingListMealPlanItem join table
CREATE TABLE IF NOT EXISTS public."ShoppingListMealPlanItem" (
  "listId" text NOT NULL REFERENCES public."ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "mealPlanItemId" text NOT NULL REFERENCES public."MealPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "ShoppingListMealPlanItem_pkey" PRIMARY KEY ("listId", "mealPlanItemId")
);
CREATE INDEX IF NOT EXISTS "ShoppingListMealPlanItem_mealPlanItemId_idx" ON public."ShoppingListMealPlanItem"("mealPlanItemId");

-- 6. Track migration in pgmigrations
INSERT INTO public.pgmigrations (name, run_on)
SELECT '005_add_shopping_lists', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '005_add_shopping_lists'
);
