-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RecipeIngredientRowKind" AS ENUM ('HEADING', 'ITEM');

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "cookbookId" TEXT,
    "title" VARCHAR(500) NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "servings" INTEGER,
    "prepMinutes" INTEGER,
    "cookMinutes" INTEGER,
    "sourceUrl" TEXT,
    "instructions" JSONB NOT NULL,
    "imagePath" VARCHAR(1024),
    "imageMimeType" VARCHAR(100),
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "imageSizeBytes" INTEGER,
    "draftSavedAt" TIMESTAMP(3),
    "lastAutosavedAt" TIMESTAMP(3),
    "autosaveVersion" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeTag" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameNormalized" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeTagOnRecipe" (
    "recipeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeTagOnRecipe_pkey" PRIMARY KEY ("recipeId","tagId")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "nameNormalized" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientTranslation" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "nameNormalized" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameNormalized" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredientRow" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "RecipeIngredientRowKind" NOT NULL,
    "heading" VARCHAR(500),
    "ingredientId" TEXT,
    "quantity" VARCHAR(100),
    "unitId" TEXT,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeIngredientRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recipe_householdId_updatedAt_idx" ON "Recipe"("householdId", "updatedAt");

-- CreateIndex
CREATE INDEX "Recipe_householdId_status_updatedAt_idx" ON "Recipe"("householdId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Recipe_cookbookId_idx" ON "Recipe"("cookbookId");

-- CreateIndex
CREATE INDEX "RecipeTag_householdId_idx" ON "RecipeTag"("householdId");

-- CreateIndex
CREATE INDEX "RecipeTag_householdId_name_idx" ON "RecipeTag"("householdId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeTag_householdId_nameNormalized_key" ON "RecipeTag"("householdId", "nameNormalized");

-- CreateIndex
CREATE INDEX "RecipeTagOnRecipe_tagId_idx" ON "RecipeTagOnRecipe"("tagId");

-- CreateIndex
CREATE INDEX "Ingredient_householdId_idx" ON "Ingredient"("householdId");

-- CreateIndex
CREATE INDEX "Ingredient_householdId_name_idx" ON "Ingredient"("householdId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_householdId_nameNormalized_key" ON "Ingredient"("householdId", "nameNormalized");

-- CreateIndex
CREATE INDEX "IngredientTranslation_locale_nameNormalized_idx" ON "IngredientTranslation"("locale", "nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientTranslation_ingredientId_locale_key" ON "IngredientTranslation"("ingredientId", "locale");

-- CreateIndex
CREATE INDEX "Unit_householdId_idx" ON "Unit"("householdId");

-- CreateIndex
CREATE INDEX "Unit_householdId_name_idx" ON "Unit"("householdId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_householdId_nameNormalized_key" ON "Unit"("householdId", "nameNormalized");

-- CreateIndex
CREATE INDEX "RecipeIngredientRow_recipeId_position_idx" ON "RecipeIngredientRow"("recipeId", "position");

-- CreateIndex
CREATE INDEX "RecipeIngredientRow_ingredientId_idx" ON "RecipeIngredientRow"("ingredientId");

-- CreateIndex
CREATE INDEX "RecipeIngredientRow_unitId_idx" ON "RecipeIngredientRow"("unitId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTag" ADD CONSTRAINT "RecipeTag_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTagOnRecipe" ADD CONSTRAINT "RecipeTagOnRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTagOnRecipe" ADD CONSTRAINT "RecipeTagOnRecipe_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "RecipeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTranslation" ADD CONSTRAINT "IngredientTranslation_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredientRow" ADD CONSTRAINT "RecipeIngredientRow_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredientRow" ADD CONSTRAINT "RecipeIngredientRow_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredientRow" ADD CONSTRAINT "RecipeIngredientRow_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
