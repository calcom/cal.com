-- AlterTable
ALTER TABLE "AttributeToUser" ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "updatedByDSyncId" TEXT,
ADD COLUMN     "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_updatedByDSyncId_fkey" FOREIGN KEY ("updatedByDSyncId") REFERENCES "DSyncData"("directoryId") ON DELETE SET NULL ON UPDATE CASCADE;
