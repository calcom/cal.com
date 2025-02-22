-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttributeOption" ADD COLUMN     "contains" TEXT[],
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttributeToUser" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdByDSyncId" TEXT,
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "updatedByDSyncId" TEXT,
ADD COLUMN     "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_createdByDSyncId_fkey" FOREIGN KEY ("createdByDSyncId") REFERENCES "DSyncData"("directoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_updatedByDSyncId_fkey" FOREIGN KEY ("updatedByDSyncId") REFERENCES "DSyncData"("directoryId") ON DELETE SET NULL ON UPDATE CASCADE;
