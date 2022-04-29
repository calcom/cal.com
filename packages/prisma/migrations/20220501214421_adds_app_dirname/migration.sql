/*
  Warnings:

  - A unique constraint covering the columns `[dirName]` on the table `App` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dirName` to the `App` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "App" ADD COLUMN     "dirName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "App_dirName_key" ON "App"("dirName");
