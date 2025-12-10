import { z } from "zod";

import { ActorSchema } from "@calcom/features/bookings/lib/types/actor";

/**
 * Supported booking audit actions
 * Used for runtime validation of action field
 */
export const BookingAuditActionSchema = z.enum([
    "CREATED",
    "RESCHEDULED",
    "ACCEPTED",
    "CANCELLED",
    "RESCHEDULE_REQUESTED",
    "ATTENDEE_ADDED",
    "HOST_NO_SHOW_UPDATED",
    "REJECTED",
    "ATTENDEE_REMOVED",
    "REASSIGNMENT",
    "LOCATION_CHANGED",
    "ATTENDEE_NO_SHOW_UPDATED",
    "SEAT_BOOKED",
    "SEAT_RESCHEDULED",
]);

export type BookingAuditAction = z.infer<typeof BookingAuditActionSchema>;

/**
 * Lean base schema for booking audit task payload
 * 
 * Uses `data: z.unknown()` to avoid large discriminated union.
 * The consumer parses with this first, then validates `data` 
 * with the action-specific schema based on the `action` field.
 */
export const BookingAuditTaskBaseSchema = z.object({
    bookingUid: z.string(),
    actor: ActorSchema,
    organizationId: z.number().nullable(),
    timestamp: z.number(),
    action: BookingAuditActionSchema,
    data: z.unknown(),
});

export type BookingAuditTaskBasePayload = z.infer<typeof BookingAuditTaskBaseSchema>;
