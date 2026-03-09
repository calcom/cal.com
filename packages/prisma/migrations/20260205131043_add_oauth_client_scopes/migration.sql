-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AccessScope" ADD VALUE 'EVENT_TYPE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'EVENT_TYPE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'BOOKING_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'BOOKING_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'SCHEDULE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'SCHEDULE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'APPS_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'APPS_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'PROFILE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'PROFILE_WRITE';

-- AlterTable
ALTER TABLE "public"."OAuthClient" ADD COLUMN     "scopes" "public"."AccessScope"[];
