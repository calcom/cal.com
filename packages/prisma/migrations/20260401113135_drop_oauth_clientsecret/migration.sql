/*
  Warnings:

  - You are about to drop the column `clientSecret` on the `OAuthClient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."OAuthClient" DROP COLUMN "clientSecret";
