-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "allowSEOIndexing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orgProfileRedirectsToVerifiedDomain" BOOLEAN NOT NULL DEFAULT false;
