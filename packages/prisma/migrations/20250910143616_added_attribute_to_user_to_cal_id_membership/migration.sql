/*
  Warnings:

  - A unique constraint covering the columns `[calIdMemberId,attributeOptionId]` on the table `AttributeToUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AttributeToUser" ADD COLUMN     "calIdMemberId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "AttributeToUser_calIdMemberId_attributeOptionId_key" ON "AttributeToUser"("calIdMemberId", "attributeOptionId");

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_calIdMemberId_fkey" FOREIGN KEY ("calIdMemberId") REFERENCES "CalIdMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
