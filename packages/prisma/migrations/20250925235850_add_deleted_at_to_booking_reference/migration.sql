/*
  Warnings:

  - You are about to drop the column `sid` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "sid";
