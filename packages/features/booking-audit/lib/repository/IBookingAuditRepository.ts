export type BookingAuditType = "RECORD_CREATED" | "RECORD_UPDATED" | "RECORD_DELETED"
export type BookingAuditAction = "CREATED" | "CANCELLED" | "ACCEPTED" | "REJECTED" | "PENDING" | "AWAITING_HOST" | "RESCHEDULED" | "ATTENDEE_ADDED" | "ATTENDEE_REMOVED" | "CANCELLATION_REASON_UPDATED" | "REJECTION_REASON_UPDATED" | "ASSIGNMENT_REASON_UPDATED" | "REASSIGNMENT_REASON_UPDATED" | "LOCATION_CHANGED" | "HOST_NO_SHOW_UPDATED" | "ATTENDEE_NO_SHOW_UPDATED" | "RESCHEDULE_REQUESTED"
export type BookingAuditCreateInput = {
    bookingUid: string;
    actorId: string;
    action: BookingAuditAction;
    data: unknown;
    createdAt: Date;
    type: BookingAuditType;
    timestamp: Date;
}

type BookingAudit = {
    id: string;
    bookingUid: string;
    actorId: string;
    action: string;
    data: unknown;
    createdAt: Date;
}

export interface IBookingAuditRepository {
    /**
     * Creates a new booking audit record
     */
    create(bookingAudit: BookingAuditCreateInput): Promise<BookingAudit>;
}

