-- CreateTable
CREATE TABLE "Cookbook" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "nameNormalized" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cookbook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cookbook_householdId_idx" ON "Cookbook"("householdId");

-- CreateIndex
CREATE INDEX "Cookbook_updatedAt_idx" ON "Cookbook"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cookbook_householdId_nameNormalized_key" ON "Cookbook"("householdId", "nameNormalized");

-- AddForeignKey
ALTER TABLE "Cookbook" ADD CONSTRAINT "Cookbook_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
