-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('SEATS', 'ACTIVE_USERS');

-- AlterTable
ALTER TABLE "TeamBilling" ADD COLUMN "billingMode" "BillingMode" NOT NULL DEFAULT 'SEATS';

-- AlterTable
ALTER TABLE "OrganizationBilling" ADD COLUMN "billingMode" "BillingMode" NOT NULL DEFAULT 'SEATS';

-- Seed feature flag
INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('active-user-billing', false, 'OPERATIONAL', 'Enable active-user-based billing for teams and organizations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
