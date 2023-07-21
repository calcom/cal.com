-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "teamId" INTEGER;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
