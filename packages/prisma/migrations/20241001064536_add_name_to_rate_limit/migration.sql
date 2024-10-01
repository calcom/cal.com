/*
  Warnings:

  - Added the required column `name` to the `RateLimit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RateLimit" ADD COLUMN     "name" TEXT NOT NULL;
