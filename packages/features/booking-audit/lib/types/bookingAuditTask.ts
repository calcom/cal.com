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

type AuditActionData<T extends { TYPE: string; latestFieldsSchema: z.ZodType }> = {
    action: T["TYPE"];
    data: z.infer<T["latestFieldsSchema"]>;
};

/**
 * Producer action data type - discriminated union for type-safe queueing
 * Used by the legacy queueAudit method for backwards compatibility
 */
export type BookingAuditTaskProducerActionData =
    | AuditActionData<typeof CreatedAuditActionService>
    | AuditActionData<typeof RescheduledAuditActionService>
    | AuditActionData<typeof AcceptedAuditActionService>
    | AuditActionData<typeof CancelledAuditActionService>
    | AuditActionData<typeof RescheduleRequestedAuditActionService>
    | AuditActionData<typeof AttendeeAddedAuditActionService>
    | AuditActionData<typeof HostNoShowUpdatedAuditActionService>
    | AuditActionData<typeof RejectedAuditActionService>
    | AuditActionData<typeof AttendeeRemovedAuditActionService>
    | AuditActionData<typeof ReassignmentAuditActionService>
    | AuditActionData<typeof LocationChangedAuditActionService>
    | AuditActionData<typeof AttendeeNoShowUpdatedAuditActionService>;

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
