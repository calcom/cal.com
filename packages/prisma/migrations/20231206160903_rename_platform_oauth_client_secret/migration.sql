/*
  Warnings:

  - You are about to drop the column `client_secret` on the `PlatformOAuthClient` table. All the data in the column will be lost.
  - Added the required column `secret` to the `PlatformOAuthClient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlatformOAuthClient" DROP COLUMN "client_secret",
ADD COLUMN     "secret" TEXT NOT NULL;
