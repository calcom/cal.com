/*
  Warnings:

  - The primary key for the `CalendarCache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[dwdId,userId,key]` on the table `CalendarCache` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `CalendarCache` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "CalendarCache" DROP CONSTRAINT "CalendarCache_pkey",
ADD COLUMN     "dwdId" TEXT,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "credentialId" DROP NOT NULL,
ADD CONSTRAINT "CalendarCache_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCache_dwdId_userId_key_key" ON "CalendarCache"("dwdId", "userId", "key");

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_dwdId_fkey" FOREIGN KEY ("dwdId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
