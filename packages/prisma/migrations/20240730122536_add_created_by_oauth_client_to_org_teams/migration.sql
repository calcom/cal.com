-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "createdByOAuthClientId" TEXT;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdByOAuthClientId_fkey" FOREIGN KEY ("createdByOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
