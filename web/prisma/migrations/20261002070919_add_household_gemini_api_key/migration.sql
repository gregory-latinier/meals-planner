-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "geminiApiKeyEncrypted" TEXT,
ADD COLUMN     "geminiApiKeyMasked" VARCHAR(32),
ADD COLUMN     "geminiApiKeyUpdatedAt" TIMESTAMP(3);
