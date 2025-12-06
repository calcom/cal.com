import { z } from "zod";

import type { Actor } from "../../../bookings/lib/types/actor";
import { AcceptedAuditActionService } from "../actions/AcceptedAuditActionService";
import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";

/**
 * BookingAuditProducerService Interface
 * 
 * Producer abstraction for queueing booking audit tasks.
 * Allows for multiple implementations (e.g., Tasker, Trigger.dev).
 * 
 * Uses specialized methods per action type for better TypeScript performance
 * and type safety, avoiding large discriminated unions.
 * 
 * Implementations:
 * - BookingAuditTaskerProducerService: Uses Tasker for local/background jobs
 * - BookingAuditTriggerProducerService: (Future) Uses Trigger.dev for cloud jobs
 */
export interface BookingAuditProducerService {
    queueCreatedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueRescheduledAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueAcceptedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueCancelledAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueRescheduleRequestedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof RescheduleRequestedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueAttendeeAddedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AttendeeAddedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueHostNoShowUpdatedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueRejectedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueAttendeeRemovedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AttendeeRemovedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueReassignmentAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof ReassignmentAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueLocationChangedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof LocationChangedAuditActionService.latestFieldsSchema>
    ): Promise<void>;

    queueAttendeeNoShowUpdatedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema>
    ): Promise<void>;
}

