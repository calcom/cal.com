/*
  Warnings:

  - You are about to drop the column `dailytoken` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `dailyurl` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "dailytoken",
DROP COLUMN "dailyurl";
