-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "allowSEOIndexing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableOrgSubdomainURL" BOOLEAN NOT NULL DEFAULT false;
