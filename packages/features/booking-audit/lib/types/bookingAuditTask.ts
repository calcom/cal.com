import { z } from "zod";

import { ActorSchema } from "@calcom/features/bookings/lib/types/actor";
import {
    createdFieldsSchemaAllVersions,
    createdFieldsSchema
} from "../actions/CreatedAuditActionService";
import {
    acceptedFieldsSchemaAllVersions,
    acceptedFieldsSchema
} from "../actions/AcceptedAuditActionService";
import {
    cancelledFieldsSchemaAllVersions,
    cancelledFieldsSchema
} from "../actions/CancelledAuditActionService";
import {
    rejectedFieldsSchemaAllVersions,
    rejectedFieldsSchema
} from "../actions/RejectedAuditActionService";
import {
    rescheduledFieldsSchemaAllVersions,
    rescheduledFieldsSchema
} from "../actions/RescheduledAuditActionService";
import {
    rescheduleRequestedFieldsSchemaAllVersions,
    rescheduleRequestedFieldsSchema
} from "../actions/RescheduleRequestedAuditActionService";
import {
    attendeeAddedFieldsSchemaAllVersions,
    attendeeAddedFieldsSchema
} from "../actions/AttendeeAddedAuditActionService";
import {
    attendeeRemovedFieldsSchemaAllVersions,
    attendeeRemovedFieldsSchema
} from "../actions/AttendeeRemovedAuditActionService";
import {
    reassignmentFieldsSchemaAllVersions,
    reassignmentFieldsSchema
} from "../actions/ReassignmentAuditActionService";
import {
    locationChangedFieldsSchemaAllVersions,
    locationChangedFieldsSchema
} from "../actions/LocationChangedAuditActionService";
import {
    hostNoShowUpdatedFieldsSchemaAllVersions,
    hostNoShowUpdatedFieldsSchema
} from "../actions/HostNoShowUpdatedAuditActionService";
import {
    attendeeNoShowUpdatedFieldsSchemaAllVersions,
    attendeeNoShowUpdatedFieldsSchema
} from "../actions/AttendeeNoShowUpdatedAuditActionService";

/**
 * Zod schema for BookingAuditTaskPayload
 * 
 * Consumer-side validation for task payloads received from the queue.
 * Uses discriminated union to ensure type safety.
 * 
 * Schema Versioning Strategy:
 * - Consumer payload schema accepts ALL supported versions via union schemas (AllVersions)
 * - Each action service explicitly declares which versions it supports
 * - Consumer migrates old payloads to latest version at task boundary
 * - Producers always use latest schema version
 * 
 * When adding V2:
 * 1. Add V2 schema to action service
 * 2. Update action service's AllVersions union to include V2
 * 3. Implement migrateToLatest in action service
 * 4. This file automatically accepts V2 via the union
 */
export const BookingAuditTaskConsumerPayloadSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("CREATED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: createdFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("ACCEPTED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: acceptedFieldsSchemaAllVersions.optional(),
    }),
    z.object({
        action: z.literal("CANCELLED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: cancelledFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("REJECTED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: rejectedFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("RESCHEDULED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: rescheduledFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("RESCHEDULE_REQUESTED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: rescheduleRequestedFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("ATTENDEE_ADDED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: attendeeAddedFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("ATTENDEE_REMOVED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: attendeeRemovedFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("REASSIGNMENT"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: reassignmentFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("LOCATION_CHANGED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: locationChangedFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("HOST_NO_SHOW_UPDATED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: hostNoShowUpdatedFieldsSchemaAllVersions,
    }),
    z.object({
        action: z.literal("ATTENDEE_NO_SHOW_UPDATED"),
        bookingUid: z.string(),
        actor: ActorSchema,
        organizationId: z.number().nullable(),
        data: attendeeNoShowUpdatedFieldsSchemaAllVersions,
    }),
]);

/**
 * Booking Audit Action Data
 * 
 * Discriminated union for audit action and its associated data.
 * Used for type-safe audit queueing without bookingUid and actor.
 * 
 * Uses latest schema version - producers always queue with latest version.
 */
export type BookingAuditActionData =
    | { action: "CREATED"; data: z.infer<typeof createdFieldsSchema> }
    | { action: "ACCEPTED"; data?: z.infer<typeof acceptedFieldsSchema> }
    | { action: "CANCELLED"; data: z.infer<typeof cancelledFieldsSchema> }
    | { action: "REJECTED"; data: z.infer<typeof rejectedFieldsSchema> }
    | { action: "RESCHEDULED"; data: z.infer<typeof rescheduledFieldsSchema> }
    | { action: "RESCHEDULE_REQUESTED"; data: z.infer<typeof rescheduleRequestedFieldsSchema> }
    | { action: "ATTENDEE_ADDED"; data: z.infer<typeof attendeeAddedFieldsSchema> }
    | { action: "ATTENDEE_REMOVED"; data: z.infer<typeof attendeeRemovedFieldsSchema> }
    | { action: "REASSIGNMENT"; data: z.infer<typeof reassignmentFieldsSchema> }
    | { action: "LOCATION_CHANGED"; data: z.infer<typeof locationChangedFieldsSchema> }
    | { action: "HOST_NO_SHOW_UPDATED"; data: z.infer<typeof hostNoShowUpdatedFieldsSchema> }
    | { action: "ATTENDEE_NO_SHOW_UPDATED"; data: z.infer<typeof attendeeNoShowUpdatedFieldsSchema> };

/**
 * Booking Audit Task Payload
 * 
 * Complete task payload including bookingUid, actor, action, and data.
 * This is what gets serialized and sent to the task queue.
 * 
 * Derived from BookingAuditTaskConsumerPayloadSchema using z.infer.
 */
export type BookingAuditTaskPayload = z.infer<typeof BookingAuditTaskConsumerPayloadSchema>;
