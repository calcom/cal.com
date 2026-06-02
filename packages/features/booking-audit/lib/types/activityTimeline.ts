import type { BookingAuditAction } from "../repository/IBookingAuditRepository";

export const BOOKING_ACTIVITY_CATEGORIES = [
  "creation",
  "update",
  "attendee",
  "reminder",
  "integration",
] as const;

export type BookingActivityCategory = (typeof BOOKING_ACTIVITY_CATEGORIES)[number];

export type BookingActivityEventKind = "audit" | "reminder" | "integration" | "payment" | "synthetic";

export const AUDIT_ACTION_ACTIVITY_CATEGORY: Record<BookingAuditAction, BookingActivityCategory> = {
  CREATED: "creation",
  AWAITING_HOST: "creation",
  SEAT_BOOKED: "creation",
  PENDING: "update",
  ACCEPTED: "update",
  REJECTED: "update",
  CANCELLED: "update",
  RESCHEDULED: "update",
  RESCHEDULE_REQUESTED: "update",
  REASSIGNMENT: "update",
  LOCATION_CHANGED: "update",
  SEAT_RESCHEDULED: "update",
  ATTENDEE_ADDED: "attendee",
  ATTENDEE_REMOVED: "attendee",
  NO_SHOW_UPDATED: "attendee",
};

export function getActivityCategoryForAuditAction(action: BookingAuditAction): BookingActivityCategory {
  return AUDIT_ACTION_ACTIVITY_CATEGORY[action];
}
