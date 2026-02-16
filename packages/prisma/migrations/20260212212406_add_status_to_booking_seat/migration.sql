-- AlterTable
ALTER TABLE "public"."BookingSeat" ADD COLUMN     "status" "public"."BookingStatus" NOT NULL DEFAULT 'accepted';
