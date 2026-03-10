-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_EVENT_TYPE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_EVENT_TYPE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_BOOKING_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_BOOKING_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_SCHEDULE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_SCHEDULE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_PROFILE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_PROFILE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_MEMBERSHIP_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'TEAM_MEMBERSHIP_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_EVENT_TYPE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_EVENT_TYPE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_BOOKING_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_BOOKING_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_SCHEDULE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_SCHEDULE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_PROFILE_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_PROFILE_WRITE';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_MEMBERSHIP_READ';
ALTER TYPE "public"."AccessScope" ADD VALUE 'ORG_MEMBERSHIP_WRITE';
