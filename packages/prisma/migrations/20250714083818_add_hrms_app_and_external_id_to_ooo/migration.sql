-- AlterEnum
ALTER TYPE "AppCategories" ADD VALUE 'hrms';

-- AlterTable
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN     "externalId" TEXT;
