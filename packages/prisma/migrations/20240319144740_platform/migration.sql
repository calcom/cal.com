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

-- CreateTable
CREATE TABLE "platform_authorization_token" (
    "id" TEXT NOT NULL,
    "platform_oauth_client_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_authorization_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_access_tokens" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "platform_oauth_client_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "platform_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_token" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "platform_oauth_client_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "platform_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlatformOAuthClientToUser" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_authorization_token_user_id_platform_oauth_client__key" ON "platform_authorization_token"("user_id", "platform_oauth_client_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_access_tokens_secret_key" ON "platform_access_tokens"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "platform_refresh_token_secret_key" ON "platform_refresh_token"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "_PlatformOAuthClientToUser_AB_unique" ON "_PlatformOAuthClientToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_PlatformOAuthClientToUser_B_index" ON "_PlatformOAuthClientToUser"("B");

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

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
