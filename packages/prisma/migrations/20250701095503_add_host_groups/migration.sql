/*
  Warnings:

  - You are about to drop the column `hostGroupId` on the `Host` table. All the data in the column will be lost.
  - The primary key for the `HostGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Host" DROP CONSTRAINT "Host_hostGroupId_fkey";

-- AlterTable
ALTER TABLE "Host" DROP COLUMN "hostGroupId",
ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "HostGroup" DROP CONSTRAINT "HostGroup_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "HostGroup_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "HostGroup_id_seq";

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HostGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
