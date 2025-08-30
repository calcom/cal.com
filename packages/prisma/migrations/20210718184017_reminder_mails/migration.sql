-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('PENDING_BOOKING_CONFIRMATION');

-- CreateTable
CREATE TABLE "ReminderMail" (
    "id" SERIAL NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "elapsedMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);
