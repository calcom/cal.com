/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `EventTypeTranslation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uid` to the `EventTypeTranslation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventTypeTranslation" ADD COLUMN     "uid" TEXT;
UPDATE "EventTypeTranslation" SET "uid" = "id";
ALTER TABLE "EventTypeTranslation" ALTER COLUMN "uid" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EventTypeTranslation_uid_key" ON "EventTypeTranslation"("uid");

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
