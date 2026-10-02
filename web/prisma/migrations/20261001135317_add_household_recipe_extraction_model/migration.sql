-- CreateEnum
CREATE TYPE "RecipeExtractionModel" AS ENUM ('GEMINI_FREE');

-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "recipeExtractionModel" "RecipeExtractionModel" NOT NULL DEFAULT 'GEMINI_FREE';
