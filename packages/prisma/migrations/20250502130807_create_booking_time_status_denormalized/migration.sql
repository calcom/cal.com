-- CreateTable
CREATE TABLE "BookingTimeStatusDenormalized" (
    "id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "location" TEXT,
    "paid" BOOLEAN,
    "status" "BookingStatus" NOT NULL,
    "rescheduled" BOOLEAN,
    "userId" INTEGER,
    "teamId" INTEGER,
    "eventLength" INTEGER,
    "timeStatus" TEXT,
    "eventParentId" INTEGER,
    "userEmail" TEXT,
    "userName" TEXT,
    "userUsername" TEXT,
    "ratingFeedback" TEXT,
    "rating" INTEGER,
    "noShowHost" BOOLEAN,
    "isTeamBooking" BOOLEAN NOT NULL,

    CONSTRAINT "BookingTimeStatusDenormalized_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_userId_idx" ON "BookingTimeStatusDenormalized"("userId");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_createdAt_idx" ON "BookingTimeStatusDenormalized"("createdAt");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_eventTypeId_idx" ON "BookingTimeStatusDenormalized"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_eventParentId_idx" ON "BookingTimeStatusDenormalized"("eventParentId");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_timeStatus_idx" ON "BookingTimeStatusDenormalized"("timeStatus");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_teamId_idx" ON "BookingTimeStatusDenormalized"("teamId");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_startTime_idx" ON "BookingTimeStatusDenormalized"("startTime");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_endTime_idx" ON "BookingTimeStatusDenormalized"("endTime");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_status_idx" ON "BookingTimeStatusDenormalized"("status");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_teamId_isTeamBooking_idx" ON "BookingTimeStatusDenormalized"("teamId", "isTeamBooking");

-- CreateIndex
CREATE INDEX "BookingTimeStatusDenormalized_userId_isTeamBooking_idx" ON "BookingTimeStatusDenormalized"("userId", "isTeamBooking");

-- CreateIndex
CREATE UNIQUE INDEX "BookingTimeStatusDenormalized_id_key" ON "BookingTimeStatusDenormalized"("id");
