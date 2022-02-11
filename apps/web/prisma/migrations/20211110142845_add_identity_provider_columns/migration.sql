-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('CAL', 'GOOGLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "identityProvider" "IdentityProvider" NOT NULL DEFAULT E'CAL',
ADD COLUMN     "identityProviderId" TEXT;
