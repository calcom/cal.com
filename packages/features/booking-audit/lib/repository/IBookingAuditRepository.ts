import type { JsonValue } from "@calcom/types/Json";

export type BookingAuditType = "RECORD_CREATED" | "RECORD_UPDATED" | "RECORD_DELETED"

/**
 * Booking audit actions track changes to bookings throughout their lifecycle.
 * 
 * Note: PENDING and AWAITING_HOST represent initial booking states, not transitions.
 * They are reserved in the enum for potential future use but should not appear in audit logs.
 * Use the CREATED action to capture initial booking status instead.
 */
export type BookingAuditAction = "CREATED" | "CANCELLED" | "ACCEPTED" | "REJECTED" | "PENDING" | "AWAITING_HOST" | "RESCHEDULED" | "ATTENDEE_ADDED" | "ATTENDEE_REMOVED" | "REASSIGNMENT" | "LOCATION_CHANGED" | "HOST_NO_SHOW_UPDATED" | "ATTENDEE_NO_SHOW_UPDATED" | "RESCHEDULE_REQUESTED"
export type BookingAuditCreateInput = {
    bookingUid: string;
    linkedBookingUid?: string | null;
    actorId: string;
    action: BookingAuditAction;
    data: JsonValue;
    type: BookingAuditType;
    timestamp: Date;
}

type BookingAudit = {
    id: string;
    bookingUid: string;
    linkedBookingUid: string | null;
    actorId: string;
    action: BookingAuditAction;
    type: BookingAuditType;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    data: JsonValue;
}

export type BookingAuditWithActor = BookingAudit & {
    actor: {
        id: string;
        type: string;
        userUuid: string | null;
        attendeeId: number | null;
        email: string | null;
        phone: string | null;
        name: string | null;
        createdAt: Date;
    };
}

export interface IBookingAuditRepository {
    /**
     * Creates a new booking audit record
     */
    create(bookingAudit: BookingAuditCreateInput): Promise<BookingAudit>;

    /**
     * Finds all audit logs for a booking, including logs where this booking is linked
     * Returns audit logs with actor information included
     */
    findAllForBooking(bookingUid: string): Promise<BookingAuditWithActor[]>;
}
