/*
  Warnings:

  - The values [pending,awaiting_host,cancellation_reason_updated,rejection_reason_updated,assignment_reason_updated,meeting_url_updated] on the enum `BookingAuditAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BookingAuditAction_new" AS ENUM ('created', 'cancelled', 'accepted', 'rejected', 'rescheduled', 'attendee_added', 'attendee_removed', 'reassignment', 'location_changed', 'host_no_show_updated', 'attendee_no_show_updated', 'reschedule_requested');
ALTER TABLE "public"."BookingAudit" ALTER COLUMN "action" TYPE "public"."BookingAuditAction_new" USING ("action"::text::"public"."BookingAuditAction_new");
ALTER TYPE "public"."BookingAuditAction" RENAME TO "BookingAuditAction_old";
ALTER TYPE "public"."BookingAuditAction_new" RENAME TO "BookingAuditAction";
DROP TYPE "public"."BookingAuditAction_old";
COMMIT;
