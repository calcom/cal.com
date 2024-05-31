-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('READ_BOOKING', 'READ_PROFILE');

-- CreateTable
CREATE TABLE "OAuthClient" (
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" "AccessScope"[],
    "userId" INTEGER,
    "teamId" INTEGER,

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
