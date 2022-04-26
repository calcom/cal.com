-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('OTHER', 'ZAPIER');

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "apiKeyType" "ApiKeyType" NOT NULL DEFAULT E'OTHER';
