/*
  Warnings:

  - A unique constraint covering the columns `[orgOwnerEmail]` on the table `OrganizationOnboarding` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `OrganizationOnboarding` will be added. If there are existing duplicate values, this will fail.
  - Made the column `stripeCustomerId` on table `OrganizationOnboarding` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrganizationOnboarding" ALTER COLUMN "stripeCustomerId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_orgOwnerEmail_key" ON "OrganizationOnboarding"("orgOwnerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_stripeCustomerId_key" ON "OrganizationOnboarding"("stripeCustomerId");
