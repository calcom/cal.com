-- CreateEnum
CREATE TYPE "BookingAuditType" AS ENUM ('RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED');

-- CreateEnum
CREATE TYPE "BookingAuditAction" AS ENUM ('cancelled', 'accepted', 'rejected', 'pending', 'awaiting_host', 'rescheduled', 'attendee_added', 'attendee_removed', 'cancellation_reason_updated', 'rejection_reason_updated', 'assignment_reason_updated', 'reassignment_reason_updated', 'location_changed', 'meeting_url_updated', 'host_no_show_updated', 'attendee_no_show_updated', 'reschedule_requested');

-- CreateTable
CREATE TABLE "BookingAudit" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "BookingAuditType" NOT NULL,
    "action" "BookingAuditAction",
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,

    CONSTRAINT "BookingAudit_pkey" PRIMARY KEY ("id")
);
