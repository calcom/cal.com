import { z } from "zod";
import type { Tasker } from "@calcom/features/tasker/tasker";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import type { Actor } from "../../../bookings/lib/types/actor";
import type { BookingAuditAction } from "../types/bookingAuditTask";
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
import type { BookingAuditProducerService } from "./BookingAuditProducerService.interface";

interface BookingAuditTaskerProducerServiceDeps {
    tasker: Tasker;
    log: ISimpleLogger;
}

/**
 * BookingAuditTaskerProducerService - Tasker-based implementation of BookingAuditProducerService
 * 
 * Producer that uses Tasker for local/background job processing.
 * Task processing is handled by BookingAuditTaskConsumer.
 * 
 * For future migration to trigger.dev, create BookingAuditTriggerProducerService
 * that implements the same BookingAuditProducerService interface.
 */
export class BookingAuditTaskerProducerService implements BookingAuditProducerService {
    private readonly tasker: Tasker;
    private readonly log: BookingAuditTaskerProducerServiceDeps["log"];

    constructor(private readonly deps: BookingAuditTaskerProducerServiceDeps) {
        this.tasker = deps.tasker;
        this.log = deps.log;
    }

    /**
     * Internal helper to queue audit task to Tasker
     * @param action - Must be a valid BookingAuditAction value (TYPE from action services are string-typed)
     */
    private async queueTask(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        action: string,
        data: unknown
    ): Promise<void> {
        // Skip queueing for non-organization bookings
        if (organizationId === null) {
            return;
        }
        if (IS_PRODUCTION) {
            return;
        }
        try {
            // Cast action to BookingAuditAction since action service TYPE constants are typed as string
            await this.tasker.create("bookingAudit", {
                bookingUid,
                actor,
                organizationId,
                timestamp: Date.now(),
                action: action as BookingAuditAction,
                data,
            });
        } catch (error) {
            this.log.error(`Error while queueing ${action} audit`, safeStringify(error));
        }
    }

    async queueCreatedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, CreatedAuditActionService.TYPE, data);
    }

    async queueRescheduledAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, RescheduledAuditActionService.TYPE, data);
    }

    async queueAcceptedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, AcceptedAuditActionService.TYPE, data);
    }

    async queueCancelledAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, CancelledAuditActionService.TYPE, data);
    }

    async queueRescheduleRequestedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof RescheduleRequestedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, RescheduleRequestedAuditActionService.TYPE, data);
    }

    async queueAttendeeAddedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AttendeeAddedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, AttendeeAddedAuditActionService.TYPE, data);
    }

    async queueHostNoShowUpdatedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, HostNoShowUpdatedAuditActionService.TYPE, data);
    }

    async queueRejectedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, RejectedAuditActionService.TYPE, data);
    }

    async queueAttendeeRemovedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AttendeeRemovedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, AttendeeRemovedAuditActionService.TYPE, data);
    }

    async queueReassignmentAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof ReassignmentAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, ReassignmentAuditActionService.TYPE, data);
    }

    async queueLocationChangedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof LocationChangedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, LocationChangedAuditActionService.TYPE, data);
    }

    async queueAttendeeNoShowUpdatedAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema>
    ): Promise<void> {
        await this.queueTask(bookingUid, actor, organizationId, AttendeeNoShowUpdatedAuditActionService.TYPE, data);
    }
}
