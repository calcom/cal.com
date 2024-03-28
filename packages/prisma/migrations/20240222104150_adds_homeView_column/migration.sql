/*
  Warnings:

  - The `homeView` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "homeViewValues" AS ENUM ('event_types', 'bookings', 'insights');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "homeView",
ADD COLUMN     "homeView" "homeViewValues" NOT NULL DEFAULT 'event_types';
