/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `Webhook` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uid` to the `Webhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "uid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Webhook.uid_unique" ON "Webhook"("uid");
