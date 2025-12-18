import { z } from "zod";
import type { Tasker } from "@calcom/features/tasker/tasker";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import type { Actor } from "../../../bookings/lib/types/actor";
import type { BookingAuditAction, BookingAuditTaskProducerActionData } from "../types/bookingAuditTask";
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
     * Queue Audit - Legacy method for backwards compatibility
     * 
     * @deprecated Use specialized methods (queueCreatedAudit, queueCancelledAudit, etc.) instead
     */
    async queueAudit(
        bookingUid: string,
        actor: Actor,
        organizationId: number | null,
        actionData: BookingAuditTaskProducerActionData
    ): Promise<void> {
        await this.queueTask({
            bookingUid,
            actor,
            organizationId,
            action: actionData.action,
            data: actionData.data,
        });
    }

    /**
     * Internal helper to queue audit task to Tasker
     * @param params.action - Must be a valid BookingAuditAction value (TYPE from action services are string-typed)
     */
    private async queueTask(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        action: string;
        data: unknown;
    }): Promise<void> {
        // Skip queueing for non-organization bookings
        if (params.organizationId === null) {
            return;
        }
        if (IS_PRODUCTION) {
            return;
        }
        try {
            // Cast action to BookingAuditAction since action service TYPE constants are typed as string
            await this.tasker.create("bookingAudit", {
                bookingUid: params.bookingUid,
                actor: params.actor,
                organizationId: params.organizationId,
                timestamp: Date.now(),
                action: params.action as BookingAuditAction,
                data: params.data,
            });
        } catch (error) {
            this.log.error(`Error while queueing ${params.action} audit`, safeStringify(error));
        }
    }

    async queueCreatedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: CreatedAuditActionService.TYPE,
        });
    }

    async queueRescheduledAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: RescheduledAuditActionService.TYPE,
        });
    }

    async queueAcceptedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: AcceptedAuditActionService.TYPE,
        });
    }

    async queueCancelledAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: CancelledAuditActionService.TYPE,
        });
    }

    async queueRescheduleRequestedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof RescheduleRequestedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: RescheduleRequestedAuditActionService.TYPE,
        });
    }

    async queueAttendeeAddedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof AttendeeAddedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: AttendeeAddedAuditActionService.TYPE,
        });
    }

    async queueHostNoShowUpdatedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: HostNoShowUpdatedAuditActionService.TYPE,
        });
    }

    async queueRejectedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: RejectedAuditActionService.TYPE,
        });
    }

    async queueAttendeeRemovedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof AttendeeRemovedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: AttendeeRemovedAuditActionService.TYPE,
        });
    }

    async queueReassignmentAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof ReassignmentAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: ReassignmentAuditActionService.TYPE,
        });
    }

    async queueLocationChangedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof LocationChangedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: LocationChangedAuditActionService.TYPE,
        });
    }

    async queueAttendeeNoShowUpdatedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: AttendeeNoShowUpdatedAuditActionService.TYPE,
        });
    }
}
