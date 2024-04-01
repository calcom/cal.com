-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "isAdminReviewed" BOOLEAN NOT NULL DEFAULT false;

-- User written Query: Update OrganizationSettings table to mark all existing organizations as reviewed as all organizations are created by ADMIN only so far. 
UPDATE "OrganizationSettings" SET "isAdminReviewed" = true;
