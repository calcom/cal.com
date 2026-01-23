-- AlterEnum: Remove old values and add new unified value
-- Rename old type to backup
ALTER TYPE "BookingAuditAction" RENAME TO "BookingAuditAction_old";

-- Create new type without deprecated values, with new unified value
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

-- Update the column to use the new type, converting deprecated values to the new unified value
ALTER TABLE "BookingAudit" ALTER COLUMN "action" TYPE "BookingAuditAction" USING (
    CASE 
        WHEN "action"::text IN ('host_no_show_updated', 'attendee_no_show_updated') THEN 'no_show_updated'::text
        ELSE "action"::text
    END
)::"BookingAuditAction";

-- Drop the old type
DROP TYPE "BookingAuditAction_old";
