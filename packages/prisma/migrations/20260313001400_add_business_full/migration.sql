/*
  Warnings:

  - A unique constraint covering the columns `[primaryBusinessId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."BusinessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED');

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "businessId" INTEGER;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "primaryBusinessId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "duration" INTEGER,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Business" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lineUserId" TEXT,
    "smsPhoneNumber" TEXT,
    "emailAddress" TEXT,
    "businessPhone" TEXT,
    "businessEmail" TEXT,
    "lineVerified" BOOLEAN NOT NULL DEFAULT false,
    "smsVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "notifyViaLine" BOOLEAN NOT NULL DEFAULT true,
    "notifyViaSms" BOOLEAN NOT NULL DEFAULT false,
    "notifyViaEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."BusinessStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_businessId_idx" ON "public"."Service"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_businessId_name_key" ON "public"."Service"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "public"."Business"("slug");

-- CreateIndex
CREATE INDEX "Business_lineUserId_idx" ON "public"."Business"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_primaryBusinessId_key" ON "public"."users"("primaryBusinessId");

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_primaryBusinessId_fkey" FOREIGN KEY ("primaryBusinessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
