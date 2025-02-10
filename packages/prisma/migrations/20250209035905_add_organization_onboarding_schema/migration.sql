-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUALLY');

-- CreateTable
CREATE TABLE "OrganizationOnboarding" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "pricePerSeat" DOUBLE PRECISION NOT NULL,
    "seats" INTEGER NOT NULL,
    "orgOwnerEmail" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "bio" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "invitedMembers" JSONB NOT NULL DEFAULT '[]',
    "teams" JSONB NOT NULL DEFAULT '[]',
    "isComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_slug_key" ON "OrganizationOnboarding"("slug");

-- CreateIndex
CREATE INDEX "OrganizationOnboarding_orgOwnerEmail_idx" ON "OrganizationOnboarding"("orgOwnerEmail");

-- CreateIndex
CREATE INDEX "OrganizationOnboarding_stripeCustomerId_idx" ON "OrganizationOnboarding"("stripeCustomerId");
