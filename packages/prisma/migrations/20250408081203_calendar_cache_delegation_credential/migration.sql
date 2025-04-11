/*
  Warnings:

  - The primary key for the `CalendarCache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[delegationCredentialId,userId,key]` on the table `CalendarCache` will be added. If there are existing duplicate values, this will fail.
  - Made the column `id` on table `CalendarCache` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CalendarCache" DROP CONSTRAINT "CalendarCache_pkey",
ADD COLUMN     "delegationCredentialId" TEXT,
ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "credentialId" DROP NOT NULL,
ALTER COLUMN "id" SET NOT NULL,
ADD CONSTRAINT "CalendarCache_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCache_delegationCredentialId_userId_key_key" ON "CalendarCache"("delegationCredentialId", "userId", "key");

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
