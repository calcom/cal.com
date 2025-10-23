/*
  Warnings:

  - You are about to drop the column `userId` on the `BookingAudit` table. All the data in the column will be lost.
  - Added the required column `actorId` to the `BookingAudit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('user', 'guest', 'system');

-- AlterTable
ALTER TABLE "BookingAudit" DROP COLUMN "userId",
ADD COLUMN     "actorId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "type" "ActorType" NOT NULL,
    "userId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Actor_email_idx" ON "Actor"("email");

-- CreateIndex
CREATE INDEX "Actor_userId_idx" ON "Actor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_userId_key" ON "Actor"("userId");

-- CreateIndex
CREATE INDEX "BookingAudit_actorId_idx" ON "BookingAudit"("actorId");

-- CreateIndex
CREATE INDEX "BookingAudit_bookingId_idx" ON "BookingAudit"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingAudit" ADD CONSTRAINT "BookingAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Actor" ("id", "type", "userId", "email", "phone", "name", "createdAt")
VALUES ('00000000-0000-0000-0000-000000000000', 'system', NULL, NULL, NULL, 'System', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
