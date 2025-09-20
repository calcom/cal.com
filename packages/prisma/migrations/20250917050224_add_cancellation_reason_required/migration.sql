-- CreateEnum
CREATE TYPE "CancellationReasonRequired" AS ENUM ('MANDATORY_FOR_BOTH', 'MANDATORY_FOR_HOST_ONLY', 'MANDATORY_FOR_ATTENDEE_ONLY', 'OPTIONAL_FOR_BOTH');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "cancellationReasonRequired" "CancellationReasonRequired" NOT NULL DEFAULT 'MANDATORY_FOR_HOST_ONLY';