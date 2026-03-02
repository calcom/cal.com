-- CreateTable
CREATE TABLE "public"."OAuthRefreshToken" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRefreshToken_secret_key" ON "public"."OAuthRefreshToken"("secret");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_clientId_userId_idx" ON "public"."OAuthRefreshToken"("clientId", "userId");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_clientId_teamId_idx" ON "public"."OAuthRefreshToken"("clientId", "teamId");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_expiresAt_idx" ON "public"."OAuthRefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
