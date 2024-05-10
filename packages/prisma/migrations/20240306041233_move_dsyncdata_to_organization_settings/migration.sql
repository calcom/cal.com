-- DropForeignKey
ALTER TABLE "DSyncData" DROP CONSTRAINT "DSyncData_orgId_fkey";

-- AddForeignKey
ALTER TABLE "DSyncData" ADD CONSTRAINT "DSyncData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "OrganizationSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
