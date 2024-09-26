/*
  Warnings:

  - You are about to drop the `platform_access_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platform_authorization_token` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platform_oauth_clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platform_refresh_token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" DROP CONSTRAINT "_PlatformOAuthClientToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "platform_access_tokens" DROP CONSTRAINT "platform_access_tokens_platform_oauth_client_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_access_tokens" DROP CONSTRAINT "platform_access_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_authorization_token" DROP CONSTRAINT "platform_authorization_token_platform_oauth_client_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_authorization_token" DROP CONSTRAINT "platform_authorization_token_user_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_oauth_clients" DROP CONSTRAINT "platform_oauth_clients_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_refresh_token" DROP CONSTRAINT "platform_refresh_token_platform_oauth_client_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_refresh_token" DROP CONSTRAINT "platform_refresh_token_user_id_fkey";

-- DropTable
DROP TABLE "platform_access_tokens";

-- DropTable
DROP TABLE "platform_authorization_token";

-- DropTable
DROP TABLE "platform_oauth_clients";

-- DropTable
DROP TABLE "platform_refresh_token";

-- CreateTable
CREATE TABLE "PlatformOAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "permissions" INTEGER NOT NULL,
    "logo" TEXT,
    "redirectUris" TEXT[],
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuthorizationToken" (
    "id" TEXT NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuthorizationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAuthorizationToken_userId_platformOAuthClientId_key" ON "PlatformAuthorizationToken"("userId", "platformOAuthClientId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_secret_key" ON "AccessToken"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_secret_key" ON "RefreshToken"("secret");

-- AddForeignKey
ALTER TABLE "PlatformOAuthClient" ADD CONSTRAINT "PlatformOAuthClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuthorizationToken" ADD CONSTRAINT "PlatformAuthorizationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuthorizationToken" ADD CONSTRAINT "PlatformAuthorizationToken_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
