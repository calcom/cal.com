-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "isAdminAPIEnabled" BOOLEAN NOT NULL DEFAULT false;

-- User written Query: Update OrganizationSettings table to mark all existing organizations to have AdminAPI Enabled to not lose functionality.
UPDATE "OrganizationSettings" SET "isAdminAPIEnabled" = true;