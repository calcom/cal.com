import { z } from "zod";

import { ActorSchema } from "@calcom/features/bookings/lib/types/actor";
import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import { AcceptedAuditActionService } from "../actions/AcceptedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";

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
]);

export type BookingAuditAction = z.infer<typeof BookingAuditActionSchema>;

/**
 * Producer action data type - discriminated union for type-safe queueing
 * Used by the legacy queueAudit method for backwards compatibility
 */
export type BookingAuditTaskProducerActionData =
    | { action: typeof CreatedAuditActionService.TYPE; data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema> }
    | { action: typeof RescheduledAuditActionService.TYPE; data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema> }
    | { action: typeof AcceptedAuditActionService.TYPE; data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema> }
    | { action: typeof CancelledAuditActionService.TYPE; data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema> }
    | { action: typeof RescheduleRequestedAuditActionService.TYPE; data: z.infer<typeof RescheduleRequestedAuditActionService.latestFieldsSchema> }
    | { action: typeof AttendeeAddedAuditActionService.TYPE; data: z.infer<typeof AttendeeAddedAuditActionService.latestFieldsSchema> }
    | { action: typeof HostNoShowUpdatedAuditActionService.TYPE; data: z.infer<typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema> }
    | { action: typeof RejectedAuditActionService.TYPE; data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema> }
    | { action: typeof AttendeeRemovedAuditActionService.TYPE; data: z.infer<typeof AttendeeRemovedAuditActionService.latestFieldsSchema> }
    | { action: typeof ReassignmentAuditActionService.TYPE; data: z.infer<typeof ReassignmentAuditActionService.latestFieldsSchema> }
    | { action: typeof LocationChangedAuditActionService.TYPE; data: z.infer<typeof LocationChangedAuditActionService.latestFieldsSchema> }
    | { action: typeof AttendeeNoShowUpdatedAuditActionService.TYPE; data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema> };

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
