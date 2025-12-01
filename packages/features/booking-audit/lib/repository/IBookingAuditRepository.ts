import type { JsonValue } from "@calcom/types/Json";

export type BookingAuditType = "RECORD_CREATED" | "RECORD_UPDATED" | "RECORD_DELETED"
export type BookingAuditAction = "CREATED" | "CANCELLED" | "ACCEPTED" | "REJECTED" | "PENDING" | "AWAITING_HOST" | "RESCHEDULED" | "ATTENDEE_ADDED" | "ATTENDEE_REMOVED" | "REASSIGNMENT" | "LOCATION_CHANGED" | "HOST_NO_SHOW_UPDATED" | "ATTENDEE_NO_SHOW_UPDATED" | "RESCHEDULE_REQUESTED"
export type BookingAuditCreateInput = {
    bookingUid: string;
    actorId: string;
    action: BookingAuditAction;
    data: JsonValue;
    type: BookingAuditType;
    timestamp: Date;
}

type BookingAudit = {
    id: string;
    bookingUid: string;
    actorId: string;
    action: BookingAuditAction;
    type: BookingAuditType;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    data: JsonValue;
}

export interface IBookingAuditRepository {
    /**
     * Creates a new booking audit record
     */
    create(bookingAudit: BookingAuditCreateInput): Promise<BookingAudit>;
}

