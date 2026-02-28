-- CreateEnum
CREATE TYPE "public"."CancellationReasonRequirement" AS ENUM ('MANDATORY_BOTH', 'MANDATORY_HOST_ONLY', 'MANDATORY_ATTENDEE_ONLY', 'OPTIONAL_BOTH');

-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN     "requiresCancellationReason" "public"."CancellationReasonRequirement" DEFAULT 'MANDATORY_HOST_ONLY';
