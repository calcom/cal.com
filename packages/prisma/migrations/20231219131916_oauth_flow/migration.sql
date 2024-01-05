-- CreateTable
CREATE TABLE "PlatformOAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "permissions" INTEGER NOT NULL,
    "logo" TEXT,
    "redirect_uris" TEXT[],
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "PlatformOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_authorization_token" (
    "id" TEXT NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "platform_authorization_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_access_tokens" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "platform_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_token" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "platform_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlatformOAuthClientToUser" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_authorization_token_userId_platformOAuthClientId_key" ON "platform_authorization_token"("userId", "platformOAuthClientId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_access_tokens_secret_key" ON "platform_access_tokens"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "platform_refresh_token_secret_key" ON "platform_refresh_token"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "_PlatformOAuthClientToUser_AB_unique" ON "_PlatformOAuthClientToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_PlatformOAuthClientToUser_B_index" ON "_PlatformOAuthClientToUser"("B");

-- AddForeignKey
ALTER TABLE "PlatformOAuthClient" ADD CONSTRAINT "PlatformOAuthClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_authorization_token" ADD CONSTRAINT "platform_authorization_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_authorization_token" ADD CONSTRAINT "platform_authorization_token_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_access_tokens" ADD CONSTRAINT "platform_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_access_tokens" ADD CONSTRAINT "platform_access_tokens_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_refresh_token" ADD CONSTRAINT "platform_refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_refresh_token" ADD CONSTRAINT "platform_refresh_token_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
