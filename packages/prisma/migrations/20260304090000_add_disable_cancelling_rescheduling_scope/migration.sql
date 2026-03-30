-- CreateEnum
CREATE TYPE "public"."DisableCancelRescheduleScope" AS ENUM ('HOST_AND_ATTENDEE', 'ATTENDEE_ONLY');

-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN "disableCancellingScope" "public"."DisableCancelRescheduleScope" DEFAULT 'HOST_AND_ATTENDEE';

-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN "disableReschedulingScope" "public"."DisableCancelRescheduleScope" DEFAULT 'HOST_AND_ATTENDEE';
