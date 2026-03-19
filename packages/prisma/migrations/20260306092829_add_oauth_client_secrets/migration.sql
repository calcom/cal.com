-- CreateTable
CREATE TABLE "public"."OAuthClientSecret" (
    "id" SERIAL NOT NULL,
    "hashedSecret" TEXT NOT NULL,
    "secretHint" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClientSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthClientSecret_clientId_idx" ON "public"."OAuthClientSecret"("clientId");

-- AddForeignKey
ALTER TABLE "public"."OAuthClientSecret" ADD CONSTRAINT "OAuthClientSecret_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing client secrets
INSERT INTO "public"."OAuthClientSecret" ("hashedSecret", "secretHint", "clientId", "createdAt")
SELECT "clientSecret", '****', "clientId", "createdAt"
FROM "public"."OAuthClient"
WHERE "clientSecret" IS NOT NULL;
