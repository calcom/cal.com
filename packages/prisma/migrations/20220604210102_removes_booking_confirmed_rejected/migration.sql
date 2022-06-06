/*
  Warnings:

  - You are about to drop the column `confirmed` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `rejected` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "confirmed",
DROP COLUMN "rejected";
