-- CreateTable
CREATE TABLE "TeamBilling" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBilling" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamBilling_teamId_key" ON "TeamBilling"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamBilling_subscriptionId_key" ON "TeamBilling"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBilling_teamId_key" ON "OrganizationBilling"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBilling_subscriptionId_key" ON "OrganizationBilling"("subscriptionId");

-- AddForeignKey
ALTER TABLE "TeamBilling" ADD CONSTRAINT "TeamBilling_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBilling" ADD CONSTRAINT "OrganizationBilling_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
