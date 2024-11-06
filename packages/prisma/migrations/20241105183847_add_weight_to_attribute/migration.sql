/*
  Warnings:

  - Added the required column `weight` to the `AttributeToUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AttributeToUser" ADD COLUMN     "weight" INTEGER NOT NULL;
