-- CreateTable
CREATE TABLE "public"."OAuthAuthorization" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "oAuthClientId" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRefreshedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorization_userId_oAuthClientId_key" ON "public"."OAuthAuthorization"("userId", "oAuthClientId");

-- AddForeignKey
ALTER TABLE "public"."OAuthAuthorization" ADD CONSTRAINT "OAuthAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthAuthorization" ADD CONSTRAINT "OAuthAuthorization_oAuthClientId_fkey" FOREIGN KEY ("oAuthClientId") REFERENCES "public"."OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
