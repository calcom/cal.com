-- DropForeignKey
ALTER TABLE "WhatsAppBusinessPhone" DROP CONSTRAINT "WhatsAppBusinessPhone_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppBusinessPhone" DROP CONSTRAINT "WhatsAppBusinessPhone_userId_fkey";

-- AlterTable
ALTER TABLE "WhatsAppBusinessPhone" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "calIdTeamId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WhatsAppBusinessPhone" ADD CONSTRAINT "WhatsAppBusinessPhone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBusinessPhone" ADD CONSTRAINT "WhatsAppBusinessPhone_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
