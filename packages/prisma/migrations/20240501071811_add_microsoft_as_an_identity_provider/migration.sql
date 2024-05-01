-- AlterEnum
ALTER TYPE "IdentityProvider" ADD VALUE 'MICROSOFT';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "ext_expires_in" INTEGER;
