import { z } from "zod";

import { PiiFreeActorSchema } from "../../../bookings/lib/types/actor";
import { ActionSourceSchema } from "./actionSource";

/**
 * Supported booking audit actions
 * Used for runtime validation of action field
 */
const BookingAuditActionSchema = z.enum([
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

const actionAgnosticDataSchema = z.unknown();

const bookingAuditPayloadSchema = z.object({
    bookingUid: z.string(),
    data: actionAgnosticDataSchema,
});

export const SingleBookingAuditTaskConsumerSchema = z.object({
    isBulk: z.literal(false),
    ...bookingAuditPayloadSchema.shape,
    actor: PiiFreeActorSchema,
    organizationId: z.number().nullable(),
    timestamp: z.number(),
    action: BookingAuditActionSchema,
    source: ActionSourceSchema.default("UNKNOWN"),
    operationId: z.string(),
});

export type SingleBookingAuditTaskConsumerPayload = z.infer<typeof SingleBookingAuditTaskConsumerSchema>;

/**
 * Bulk booking audit task payload schema
 * 
 * Used for operations that affect multiple bookings in a single action.
 * Contains an array of bookings, each with bookingUid and action-specific data.
 * All bookings share the same actor, organizationId, timestamp, action, source, and operationId.
 */
export const BulkBookingAuditTaskConsumerSchema = z.object({
    isBulk: z.literal(true),
    bookings: z.array(bookingAuditPayloadSchema).min(1),
    actor: PiiFreeActorSchema,
    organizationId: z.number().nullable(),
    timestamp: z.number(),
    action: BookingAuditActionSchema,
    source: ActionSourceSchema.default("UNKNOWN"),
    operationId: z.string(),
});

export type BulkBookingAuditTaskConsumerPayload = z.infer<typeof BulkBookingAuditTaskConsumerSchema>;

export const BookingAuditTaskConsumerSchema = z.discriminatedUnion("isBulk", [
    SingleBookingAuditTaskConsumerSchema,
    BulkBookingAuditTaskConsumerSchema,
]);

export type BookingAuditTaskConsumerPayload = z.infer<typeof BookingAuditTaskConsumerSchema>;
