-- Migration 005 : liste de courses (équivalent manuel de server/migrations/005_add_shopping_lists.ts)
-- À lancer dans phpPgAdmin / psql. Idempotence non garantie : ne l'exécuter qu'une seule fois.
-- Si vous l'exécutez à la main, la dernière instruction l'enregistre dans "pgmigrations"
-- pour que `migrate:prod` ne la rejoue pas.

BEGIN;

ALTER TABLE "Ingredient"
  ADD COLUMN "alwaysInStock" boolean NOT NULL DEFAULT false;

CREATE TYPE "ShoppingListStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "ShoppingListItemSource" AS ENUM ('RECIPE', 'MANUAL');

CREATE TABLE "ShoppingList" (
  "id" text PRIMARY KEY,
  "householdId" text NOT NULL
    REFERENCES "Household" ON DELETE CASCADE ON UPDATE CASCADE,
  "status" "ShoppingListStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" timestamp(3)
);

CREATE INDEX "ShoppingList_householdId_createdAt_index"
  ON "ShoppingList" ("householdId", "createdAt");

-- Au plus une liste active par foyer.
CREATE UNIQUE INDEX "ShoppingList_one_active_per_household"
  ON "ShoppingList" ("householdId")
  WHERE "status" = 'ACTIVE';

CREATE TABLE "ShoppingListItem" (
  "id" text PRIMARY KEY,
  "listId" text NOT NULL
    REFERENCES "ShoppingList" ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" text
    REFERENCES "Ingredient" ON DELETE SET NULL ON UPDATE CASCADE,
  "name" varchar(300) NOT NULL,
  "nameNormalized" varchar(300) NOT NULL,
  -- [{ amount: number|null, text: string|null, unitId: string|null, unitName: string|null }]
  "quantities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Quantité saisie à la main ; prioritaire sur "quantities" à l'affichage.
  "quantityText" varchar(200),
  "storeId" text
    REFERENCES "Store" ON DELETE SET NULL ON UPDATE CASCADE,
  "source" "ShoppingListItemSource" NOT NULL DEFAULT 'MANUAL',
  -- Ingrédient « toujours en stock » : section repliée « À vérifier dans vos placards ».
  "pantryCheck" boolean NOT NULL DEFAULT false,
  "checked" boolean NOT NULL DEFAULT false,
  "checkedAt" timestamp(3),
  "position" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ShoppingListItem_listId_index" ON "ShoppingListItem" ("listId");
CREATE INDEX "ShoppingListItem_ingredientId_index" ON "ShoppingListItem" ("ingredientId");
CREATE INDEX "ShoppingListItem_storeId_index" ON "ShoppingListItem" ("storeId");

CREATE TABLE "ShoppingListMealPlanItem" (
  "listId" text NOT NULL
    REFERENCES "ShoppingList" ON DELETE CASCADE ON UPDATE CASCADE,
  "mealPlanItemId" text NOT NULL
    REFERENCES "MealPlanItem" ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShoppingListMealPlanItem_pkey" PRIMARY KEY ("listId", "mealPlanItemId")
);

CREATE INDEX "ShoppingListMealPlanItem_mealPlanItemId_index"
  ON "ShoppingListMealPlanItem" ("mealPlanItemId");

-- Enregistre la migration comme appliquée (évite que `migrate:prod` la rejoue).
INSERT INTO "pgmigrations" ("name", "run_on")
VALUES ('005_add_shopping_lists', NOW());

COMMIT;
