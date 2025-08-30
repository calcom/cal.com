/*
  Warnings:

  - The primary key for the `Host` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Host` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Host" DROP CONSTRAINT "Host_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Host_pkey" PRIMARY KEY ("userId", "eventTypeId");
