/*
  Warnings:

  - A unique constraint covering the columns `[calIdTeamId,slug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CalIdMembershipRole" AS ENUM ('MEMBER', 'ADMIN', 'OWNER');

-- AlterEnum
ALTER TYPE "FilterSegmentScope" ADD VALUE 'CALIDTEAM';

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "FilterSegment" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "VerifiedEmail" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "VerifiedNumber" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "calIdTeamId" INTEGER;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "timeZone" SET DEFAULT 'Asia/Kolkata',
ALTER COLUMN "weekStart" SET DEFAULT 'Monday';

-- CreateTable
CREATE TABLE "CalIdTeam" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logoUrl" TEXT,
    "bio" TEXT,
    "hideTeamBranding" BOOLEAN NOT NULL DEFAULT false,
    "hideTeamProfileLink" BOOLEAN NOT NULL DEFAULT false,
    "isTeamPrivate" BOOLEAN NOT NULL DEFAULT false,
    "hideBookATeamMember" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "theme" TEXT,
    "brandColor" TEXT,
    "darkBrandColor" TEXT,
    "timeFormat" INTEGER,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "weekStart" TEXT NOT NULL DEFAULT 'Monday',
    "bookingFrequency" JSONB,

    CONSTRAINT "CalIdTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdMembership" (
    "id" SERIAL NOT NULL,
    "calIdTeamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "acceptedInvitation" BOOLEAN NOT NULL DEFAULT false,
    "role" "CalIdMembershipRole" NOT NULL,
    "impersonation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CalIdMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalIdTeam_slug_key" ON "CalIdTeam"("slug");

-- CreateIndex
CREATE INDEX "CalIdMembership_calIdTeamId_idx" ON "CalIdMembership"("calIdTeamId");

-- CreateIndex
CREATE INDEX "CalIdMembership_userId_idx" ON "CalIdMembership"("userId");

-- CreateIndex
CREATE INDEX "CalIdMembership_acceptedInvitation_idx" ON "CalIdMembership"("acceptedInvitation");

-- CreateIndex
CREATE INDEX "CalIdMembership_role_idx" ON "CalIdMembership"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdMembership_userId_calIdTeamId_key" ON "CalIdMembership"("userId", "calIdTeamId");

-- CreateIndex
CREATE INDEX "EventType_calIdTeamId_idx" ON "EventType"("calIdTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_calIdTeamId_slug_key" ON "EventType"("calIdTeamId", "slug");

-- CreateIndex
CREATE INDEX "FilterSegment_scope_calIdTeamId_tableIdentifier_idx" ON "FilterSegment"("scope", "calIdTeamId", "tableIdentifier");

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedNumber" ADD CONSTRAINT "VerifiedNumber_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedEmail" ADD CONSTRAINT "VerifiedEmail_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSegment" ADD CONSTRAINT "FilterSegment_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdMembership" ADD CONSTRAINT "CalIdMembership_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdMembership" ADD CONSTRAINT "CalIdMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
