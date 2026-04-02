import type { JsonValue } from "@calcom/types/Json";
import type { BookingAuditContext } from "../dto/types";
import type { ActionSource } from "../types/actionSource";
import type { AuditActorType } from "./IAuditActorRepository";

export type BookingAuditType = "RECORD_CREATED" | "RECORD_UPDATED" | "RECORD_DELETED";

/**
 * Booking audit actions track changes to bookings throughout their lifecycle.
 *
 * Note: PENDING and AWAITING_HOST represent initial booking states, not transitions.
 * They are reserved in the enum for potential future use but should not appear in audit logs.
 * Use the CREATED action to capture initial booking status instead.
 */
export type BookingAuditAction =
  | "CREATED"
  | "CANCELLED"
  | "ACCEPTED"
  | "REJECTED"
  | "PENDING"
  | "AWAITING_HOST"
  | "RESCHEDULED"
  | "ATTENDEE_ADDED"
  | "ATTENDEE_REMOVED"
  | "REASSIGNMENT"
  | "LOCATION_CHANGED"
  | "NO_SHOW_UPDATED"
  | "RESCHEDULE_REQUESTED"
  | "SEAT_BOOKED"
  | "SEAT_RESCHEDULED";
export type BookingAuditCreateInput = {
  bookingUid: string;
  actorId: string;
  action: BookingAuditAction;
  data: JsonValue;
  type: BookingAuditType;
  timestamp: Date;
  source: ActionSource;
  operationId: string;
  context?: BookingAuditContext;
};

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
  source: ActionSource;
  operationId: string;
};

export type BookingAuditWithActor = BookingAudit & {
  context: BookingAuditContext | null;
  actor: {
    id: string;
    type: AuditActorType;
    userUuid: string | null;
    attendeeId: number | null;
    credentialId: number | null;
    name: string | null;
    createdAt: Date;
  };
};

export interface IBookingAuditRepository {
  /**
   * Creates a new booking audit record
   */
  create(bookingAudit: BookingAuditCreateInput): Promise<BookingAudit>;

  createMany(bookingAudits: BookingAuditCreateInput[]): Promise<{ count: number }>;

  /**
   * Retrieves all audit logs for a specific booking
   * @param bookingUid - The unique identifier of the booking
   * @returns Array of audit logs with actor information, ordered by timestamp DESC
   */
  findAllForBooking(bookingUid: string): Promise<BookingAuditWithActor[]>;

  /**
   * Retrieves all RESCHEDULED audit logs for a specific booking
   * @param bookingUid - The unique identifier of the booking
   * @returns Array of RESCHEDULED audit logs with actor information, ordered by timestamp DESC
   */
  findRescheduledLogsOfBooking(bookingUid: string): Promise<BookingAuditWithActor[]>;
}
