import { z } from "zod";

import type { Actor } from "../../../bookings/lib/types/actor";
import type { ActionSource } from "../types/actionSource";
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
import { SeatBookedAuditActionService } from "../actions/SeatBookedAuditActionService";
import { SeatRescheduledAuditActionService } from "../actions/SeatRescheduledAuditActionService";

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
        queueCreatedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueRescheduledAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueAcceptedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueCancelledAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueRescheduleRequestedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof RescheduleRequestedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueAttendeeAddedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof AttendeeAddedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueHostNoShowUpdatedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueRejectedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueAttendeeRemovedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof AttendeeRemovedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueReassignmentAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof ReassignmentAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueLocationChangedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof LocationChangedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueAttendeeNoShowUpdatedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueSeatBookedAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof SeatBookedAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        queueSeatRescheduledAudit(params: {
                bookingUid: string;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
                data: z.infer<typeof SeatRescheduledAuditActionService.latestFieldsSchema>;
        }): Promise<void>;

        /**
         * Queues a bulk accepted audit task for multiple bookings
         */
        queueBulkAcceptedAudit(params: {
                bookings: Array<{
                        bookingUid: string;
                        data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>;
                }>;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
        }): Promise<void>;

        /**
         * Queues a bulk cancelled audit task for multiple bookings
         */
        queueBulkCancelledAudit(params: {
                bookings: Array<{
                        bookingUid: string;
                        data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>;
                }>;
                actor: Actor;
                organizationId: number | null;
                source: ActionSource;
                operationId?: string | null;
        }): Promise<void>;
}

