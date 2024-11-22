-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttributeToUser" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdByDSyncId" TEXT,
ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_createdByDSyncId_fkey" FOREIGN KEY ("createdByDSyncId") REFERENCES "DSyncData"("directoryId") ON DELETE SET NULL ON UPDATE CASCADE;
