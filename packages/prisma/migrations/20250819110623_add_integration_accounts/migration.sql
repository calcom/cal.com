-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('CALENDLY');

-- CreateTable
CREATE TABLE "IntegrationAccounts" (
    "id" SERIAL NOT NULL,
    "tokenType" TEXT,
    "expiresIn" INTEGER,
    "createdAt" INTEGER,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT,
    "ownerUniqIdentifier" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "IntegrationAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationUserProfile" (
    "id" SERIAL NOT NULL,
    "scheduling_url" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "current_organization" TEXT,
    "integrationAccountsUserId" INTEGER NOT NULL,
    "integrationAccountsProvider" "IntegrationProvider" NOT NULL,

    CONSTRAINT "IntegrationUserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAccounts_userId_provider_key" ON "IntegrationAccounts"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationUserProfile_integrationAccountsUserId_integratio_key" ON "IntegrationUserProfile"("integrationAccountsUserId", "integrationAccountsProvider");

-- AddForeignKey
ALTER TABLE "IntegrationAccounts" ADD CONSTRAINT "IntegrationAccounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationUserProfile" ADD CONSTRAINT "IntegrationUserProfile_integrationAccountsUserId_integrati_fkey" FOREIGN KEY ("integrationAccountsUserId", "integrationAccountsProvider") REFERENCES "IntegrationAccounts"("userId", "provider") ON DELETE CASCADE ON UPDATE CASCADE;
