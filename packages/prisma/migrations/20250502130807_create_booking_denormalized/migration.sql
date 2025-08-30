-- CreateTable
CREATE TABLE "BookingDenormalized" (
    "id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "location" TEXT,
    "paid" BOOLEAN NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "rescheduled" BOOLEAN,
    "userId" INTEGER,
    "teamId" INTEGER,
    "eventLength" INTEGER,
    "eventParentId" INTEGER,
    "userEmail" TEXT,
    "userName" TEXT,
    "userUsername" TEXT,
    "ratingFeedback" TEXT,
    "rating" INTEGER,
    "noShowHost" BOOLEAN,
    "isTeamBooking" BOOLEAN NOT NULL,

    CONSTRAINT "BookingDenormalized_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingDenormalized_userId_idx" ON "BookingDenormalized"("userId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_createdAt_idx" ON "BookingDenormalized"("createdAt");

-- CreateIndex
CREATE INDEX "BookingDenormalized_eventTypeId_idx" ON "BookingDenormalized"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_eventParentId_idx" ON "BookingDenormalized"("eventParentId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_teamId_idx" ON "BookingDenormalized"("teamId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_startTime_idx" ON "BookingDenormalized"("startTime");

-- CreateIndex
CREATE INDEX "BookingDenormalized_endTime_idx" ON "BookingDenormalized"("endTime");

-- CreateIndex
CREATE INDEX "BookingDenormalized_status_idx" ON "BookingDenormalized"("status");

-- CreateIndex
CREATE INDEX "BookingDenormalized_teamId_isTeamBooking_idx" ON "BookingDenormalized"("teamId", "isTeamBooking");

-- CreateIndex
CREATE INDEX "BookingDenormalized_userId_isTeamBooking_idx" ON "BookingDenormalized"("userId", "isTeamBooking");

-- CreateIndex
CREATE UNIQUE INDEX "BookingDenormalized_id_key" ON "BookingDenormalized"("id");
