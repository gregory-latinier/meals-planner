-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "nameNormalized" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Store_householdId_idx" ON "Store"("householdId");

-- CreateIndex
CREATE INDEX "Store_updatedAt_idx" ON "Store"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Store_householdId_nameNormalized_key" ON "Store"("householdId", "nameNormalized");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
