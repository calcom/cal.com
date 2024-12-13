-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_createdByOAuthClientId_fkey";

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdByOAuthClientId_fkey" FOREIGN KEY ("createdByOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
