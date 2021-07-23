/*
  Warnings:

  - Added the required column `tenantId` to the `Attendee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN     "tenantId" TEXT NOT NULL;
