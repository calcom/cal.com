/*
  Warnings:

  - You are about to drop the column `userId` on the `BookingAudit` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('guest', 'system');

-- AlterTable
ALTER TABLE "BookingAudit" DROP COLUMN "userId",
ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "actorUserId" INTEGER;

-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "type" "ActorType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Actor_email_idx" ON "Actor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_email_key" ON "Actor"("email");

-- CreateIndex
CREATE INDEX "BookingAudit_actorUserId_idx" ON "BookingAudit"("actorUserId");

-- CreateIndex
CREATE INDEX "BookingAudit_actorId_idx" ON "BookingAudit"("actorId");

-- CreateIndex
CREATE INDEX "BookingAudit_bookingId_idx" ON "BookingAudit"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingAudit" ADD CONSTRAINT "BookingAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAudit" ADD CONSTRAINT "BookingAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Actor" ("id", "type", "email", "phone", "name", "createdAt")
VALUES ('00000000-0000-0000-0000-000000000000', 'system', NULL, NULL, 'System', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
