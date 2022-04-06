/*
  Warnings:

  - You are about to drop the column `smartContractAddress` on the `EventType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventType" DROP COLUMN IF EXISTS "smartContractAddress";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "verified" BOOLEAN DEFAULT false;
