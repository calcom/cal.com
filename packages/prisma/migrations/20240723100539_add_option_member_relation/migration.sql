/*
  Warnings:

  - You are about to drop the column `attributeId` on the `AttributeToUser` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `AttributeToUser` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[memberId,attributeOptionId]` on the table `AttributeToUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attributeOptionId` to the `AttributeToUser` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AttributeToUser" DROP CONSTRAINT "AttributeToUser_attributeId_fkey";

-- AlterTable
ALTER TABLE "AttributeToUser" DROP COLUMN "attributeId",
DROP COLUMN "options",
ADD COLUMN     "attributeOptionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AttributeToUser_memberId_attributeOptionId_key" ON "AttributeToUser"("memberId", "attributeOptionId");

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "AttributeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
