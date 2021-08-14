/*
  Warnings:

  - Added the required column `dailytoken` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dailyurl` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dailytoken" TEXT NOT NULL,
ADD COLUMN     "dailyurl" TEXT NOT NULL;
