-- CreateEnum
CREATE TYPE "BookingForwardingStatus" AS ENUM ('accepted', 'rejected', 'pending');

-- CreateTable
CREATE TABLE "BookingForwarding" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "toTeamId" INTEGER,
    "status" "BookingForwardingStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingForwarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingForwarding_uuid_key" ON "BookingForwarding"("uuid");

-- CreateIndex
CREATE INDEX "BookingForwarding_uuid_idx" ON "BookingForwarding"("uuid");

-- CreateIndex
CREATE INDEX "BookingForwarding_userId_idx" ON "BookingForwarding"("userId");

-- CreateIndex
CREATE INDEX "BookingForwarding_toUserId_idx" ON "BookingForwarding"("toUserId");

-- CreateIndex
CREATE INDEX "BookingForwarding_toTeamId_idx" ON "BookingForwarding"("toTeamId");

-- CreateIndex
CREATE INDEX "BookingForwarding_start_end_status_idx" ON "BookingForwarding"("start", "end", "status");

-- AddForeignKey
ALTER TABLE "BookingForwarding" ADD CONSTRAINT "BookingForwarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingForwarding" ADD CONSTRAINT "BookingForwarding_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingForwarding" ADD CONSTRAINT "BookingForwarding_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
