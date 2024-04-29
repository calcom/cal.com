-- CreateTable
CREATE TABLE "PlatformBilling" (
    "id" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'none',
    "subscriptionId" TEXT,
    "billingCycleStart" INTEGER,
    "billingCycleEnd" INTEGER,
    "overdue" BOOLEAN DEFAULT false,

    CONSTRAINT "PlatformBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformBilling_id_key" ON "PlatformBilling"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformBilling_customerId_key" ON "PlatformBilling"("customerId");

-- AddForeignKey
ALTER TABLE "PlatformBilling" ADD CONSTRAINT "PlatformBilling_id_fkey" FOREIGN KEY ("id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
