export enum BookingAuditErrorCode {
  /** Pre-condition: user has no organization */
  ORGANIZATION_ID_REQUIRED = "ORGANIZATION_ID_REQUIRED",
  /** Part 1 - Scope: booking not found */
  BOOKING_NOT_FOUND_OR_PERMISSION_DENIED = "BOOKING_NOT_FOUND_OR_PERMISSION_DENIED",
  /** Part 1 - Scope: booking has no owner to determine scope */
  BOOKING_HAS_NO_OWNER = "BOOKING_HAS_NO_OWNER",
  /** Part 1 - Scope: booking owner is not in user's organization */
  OWNER_NOT_IN_ORGANIZATION = "OWNER_NOT_IN_ORGANIZATION",
  /** Part 1 - Scope: booking's event type team is not in user's organization */
  EVENT_TYPE_NOT_IN_ORGANIZATION = "EVENT_TYPE_NOT_IN_ORGANIZATION",
  /** Part 2 - Permission: user is in scope but PBAC denies access */
  ORG_MEMBER_PERMISSION_DENIED = "ORG_MEMBER_PERMISSION_DENIED",
}
