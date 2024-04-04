/*
  Warnings:

  - Added the required column `guestCompany` to the `AIPhoneCallConfiguration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestEmail` to the `AIPhoneCallConfiguration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AIPhoneCallConfiguration" ADD COLUMN     "guestCompany" TEXT NOT NULL,
ADD COLUMN     "guestEmail" TEXT NOT NULL;
