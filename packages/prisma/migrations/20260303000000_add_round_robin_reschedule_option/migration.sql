-- CreateEnum
CREATE TYPE "RoundRobinRescheduleOption" AS ENUM ('ROUND_ROBIN', 'SAME_HOST', 'ATTENDEE_CHOICE');

-- AlterTable: add roundRobinRescheduleOption to EventType
ALTER TABLE "EventType" ADD COLUMN "roundRobinRescheduleOption" "RoundRobinRescheduleOption" NOT NULL DEFAULT 'ROUND_ROBIN';

-- Migrate existing data: if rescheduleWithSameRoundRobinHost was true, set to SAME_HOST
UPDATE "EventType" SET "roundRobinRescheduleOption" = 'SAME_HOST' WHERE "rescheduleWithSameRoundRobinHost" = true;

-- AlterTable: add reschedulePreference to Booking
ALTER TABLE "Booking" ADD COLUMN "reschedulePreference" BOOLEAN;
