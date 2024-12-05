/*
  Warnings:

  - You are about to drop the column `delegatedToId` on the `Credential` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_delegatedToId_fkey";

-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "delegatedToId";
