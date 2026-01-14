-- DropForeignKey
ALTER TABLE "CalIdApiKey" DROP CONSTRAINT "CalIdApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdApiKey" DROP CONSTRAINT "CalIdApiKey_appId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdApiKey" DROP CONSTRAINT "CalIdApiKey_teamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdRateLimit" DROP CONSTRAINT "CalIdRateLimit_calIdApiKeyId_fkey";

-- DropTable
DROP TABLE "CalIdApiKey";

-- DropTable
DROP TABLE "CalIdRateLimit";

