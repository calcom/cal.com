-- CreateEnum
CREATE TYPE "public"."OAuthClientType" AS ENUM ('confidential', 'public');

-- AlterTable
ALTER TABLE "public"."AccessCode" ADD COLUMN     "codeChallenge" TEXT,
ADD COLUMN     "codeChallengeMethod" TEXT DEFAULT 'S256';

-- AlterTable
ALTER TABLE "public"."OAuthClient" ADD COLUMN     "clientType" "public"."OAuthClientType" NOT NULL DEFAULT 'confidential',
ALTER COLUMN "clientSecret" DROP NOT NULL;
