-- CreateEnum
CREATE TYPE "ServiceName" AS ENUM ('MESSAGING', 'PAYMENTS', 'EMAIL');

-- CreateEnum
CREATE TYPE "ServiceProvider" AS ENUM ('TWILIO', 'ICSMOBILE');

-- CreateTable
CREATE TABLE "ThirdPartyService" (
    "id" SERIAL NOT NULL,
    "name" "ServiceName" NOT NULL,
    "defaultProvider" "ServiceProvider" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "ThirdPartyService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartyService_name_key" ON "ThirdPartyService"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartyService_name_defaultProvider_key" ON "ThirdPartyService"("name", "defaultProvider");
