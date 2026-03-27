export enum BookingAuditErrorCode {
  /** No organization context was provided for the viewer */
  NO_ORGANIZATION_CONTEXT = "NO_ORGANIZATION_CONTEXT",
  /** Booking not found — intentionally vague to avoid leaking booking existence */
  BOOKING_NOT_FOUND_OR_NO_ACCESS = "BOOKING_NOT_FOUND_OR_NO_ACCESS",
  /** Booking has no owner — cannot determine organizational scope */
  BOOKING_HAS_NO_OWNER = "BOOKING_HAS_NO_OWNER",
  /** Booking owner is not a member of the viewer's organization */
  BOOKING_OWNER_NOT_IN_ORGANIZATION = "BOOKING_OWNER_NOT_IN_ORGANIZATION",
  /** Booking's event type team does not belong to the viewer's organization */
  TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION = "TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION",
  /** Booking is in the user's org but their organization hasn't granted them audit log access */
  ORG_MEMBER_PERMISSION_DENIED = "ORG_MEMBER_PERMISSION_DENIED",
}

export type BookingAuditResult<T> =
  | { success: true; data: T }
  | { success: false; code: BookingAuditErrorCode };
