/*
  Warnings:

  - You are about to drop the column `createdAt` on the `platform_access_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `platform_access_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `platformOAuthClientId` on the `platform_access_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `platform_access_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `platformOAuthClientId` on the `platform_authorization_token` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `platform_authorization_token` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `platform_refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `platform_refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `platformOAuthClientId` on the `platform_refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `platform_refresh_token` table. All the data in the column will be lost.
  - You are about to drop the `PlatformOAuthClient` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,platform_oauth_client_id]` on the table `platform_authorization_token` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expires_at` to the `platform_access_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_oauth_client_id` to the `platform_access_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `platform_access_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_oauth_client_id` to the `platform_authorization_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `platform_authorization_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `platform_refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_oauth_client_id` to the `platform_refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `platform_refresh_token` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PlatformOAuthClient" DROP CONSTRAINT "PlatformOAuthClient_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" DROP CONSTRAINT "_PlatformOAuthClientToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "platform_access_tokens" DROP CONSTRAINT "platform_access_tokens_platformOAuthClientId_fkey";

-- DropForeignKey
ALTER TABLE "platform_access_tokens" DROP CONSTRAINT "platform_access_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "platform_authorization_token" DROP CONSTRAINT "platform_authorization_token_platformOAuthClientId_fkey";

-- DropForeignKey
ALTER TABLE "platform_authorization_token" DROP CONSTRAINT "platform_authorization_token_userId_fkey";

-- DropForeignKey
ALTER TABLE "platform_refresh_token" DROP CONSTRAINT "platform_refresh_token_platformOAuthClientId_fkey";

-- DropForeignKey
ALTER TABLE "platform_refresh_token" DROP CONSTRAINT "platform_refresh_token_userId_fkey";

-- DropIndex
DROP INDEX "platform_authorization_token_userId_platformOAuthClientId_key";

-- AlterTable
ALTER TABLE "platform_access_tokens" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "platformOAuthClientId",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "platform_oauth_client_id" TEXT NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "platform_authorization_token" DROP COLUMN "platformOAuthClientId",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "platform_oauth_client_id" TEXT NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "platform_refresh_token" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "platformOAuthClientId",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "platform_oauth_client_id" TEXT NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "PlatformOAuthClient";

-- CreateTable
CREATE TABLE "platform_oauth_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "permissions" INTEGER NOT NULL,
    "logo" TEXT,
    "redirect_uris" TEXT[],
    "organization_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_authorization_token_user_id_platform_oauth_client__key" ON "platform_authorization_token"("user_id", "platform_oauth_client_id");

-- AddForeignKey
ALTER TABLE "platform_oauth_clients" ADD CONSTRAINT "platform_oauth_clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_authorization_token" ADD CONSTRAINT "platform_authorization_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_authorization_token" ADD CONSTRAINT "platform_authorization_token_platform_oauth_client_id_fkey" FOREIGN KEY ("platform_oauth_client_id") REFERENCES "platform_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_access_tokens" ADD CONSTRAINT "platform_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_access_tokens" ADD CONSTRAINT "platform_access_tokens_platform_oauth_client_id_fkey" FOREIGN KEY ("platform_oauth_client_id") REFERENCES "platform_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_refresh_token" ADD CONSTRAINT "platform_refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_refresh_token" ADD CONSTRAINT "platform_refresh_token_platform_oauth_client_id_fkey" FOREIGN KEY ("platform_oauth_client_id") REFERENCES "platform_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "platform_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
