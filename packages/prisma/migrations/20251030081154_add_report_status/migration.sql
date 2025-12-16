-- CreateEnum
CREATE TYPE "public"."BookingReportStatus" AS ENUM ('PENDING', 'DISMISSED', 'BLOCKED');

-- AlterTable
ALTER TABLE "public"."BookingReport" ADD COLUMN     "status" "public"."BookingReportStatus" NOT NULL DEFAULT 'PENDING';
