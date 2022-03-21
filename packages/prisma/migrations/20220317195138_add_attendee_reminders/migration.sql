-- CreateEnum
CREATE TYPE "EventTypeAttendeeReminderMethod" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "EventTypeAttendeeReminderUnitTime" AS ENUM ('day', 'hour', 'minute');

-- CreateTable
CREATE TABLE "EventTypeAttendeeReminder" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "method" "EventTypeAttendeeReminderMethod" NOT NULL,
    "time" INTEGER NOT NULL,
    "unitTime" "EventTypeAttendeeReminderUnitTime" NOT NULL,

    CONSTRAINT "EventTypeAttendeeReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendeeReminder" (
    "id" SERIAL NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sendTo" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduled" BOOLEAN NOT NULL,

    CONSTRAINT "AttendeeReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendeeReminder_referenceId_key" ON "AttendeeReminder"("referenceId");

-- AddForeignKey
ALTER TABLE "EventTypeAttendeeReminder" ADD CONSTRAINT "EventTypeAttendeeReminder_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeReminder" ADD CONSTRAINT "AttendeeReminder_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
