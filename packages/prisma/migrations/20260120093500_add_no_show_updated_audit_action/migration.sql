-- AlterEnum: Add new value and remove old values
-- First add the new value
ALTER TYPE "BookingAuditAction" ADD VALUE IF NOT EXISTS 'no_show_updated';

-- Remove old enum values by recreating the type
-- Note: This requires no data to reference the old values
ALTER TYPE "BookingAuditAction" RENAME TO "BookingAuditAction_old";

CREATE TYPE "BookingAuditAction" AS ENUM (
    'created',
    'cancelled',
    'accepted',
    'rejected',
    'pending',
    'awaiting_host',
    'rescheduled',
    'attendee_added',
    'attendee_removed',
    'reassignment',
    'location_changed',
    'no_show_updated',
    'reschedule_requested',
    'seat_booked',
    'seat_rescheduled'
);

-- Migrate existing data from old enum values to new unified value
UPDATE "BookingAudit" 
SET "action" = 'no_show_updated'::"BookingAuditAction_old" 
WHERE "action" IN ('host_no_show_updated'::"BookingAuditAction_old", 'attendee_no_show_updated'::"BookingAuditAction_old");

-- Update the column to use the new type
ALTER TABLE "BookingAudit" ALTER COLUMN "action" TYPE "BookingAuditAction" USING "action"::text::"BookingAuditAction";

-- Drop the old type
DROP TYPE "BookingAuditAction_old";
