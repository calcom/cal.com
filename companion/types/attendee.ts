import type { Booking } from "@/services/types/bookings.types";

/**
 * Attendee type extracted from Booking for reuse across the codebase.
 * This provides a proper type for individual attendees instead of using `any`.
 */
export type Attendee = NonNullable<Booking["attendees"]>[number];
