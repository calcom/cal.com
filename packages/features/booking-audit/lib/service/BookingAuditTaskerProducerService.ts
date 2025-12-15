import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { Tasker } from "@calcom/features/tasker/tasker";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import type { BookingAuditAction } from "../types/bookingAuditTask";
import type { ActionSource } from "../common/actionSource";
import { makeActorById, type PIIFreeActor, type Actor, buildActorEmail } from "../../../bookings/lib/types/actor";
import type { IAuditActorRepository } from "../repository/IAuditActorRepository";
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
import type { BookingAuditProducerService } from "./BookingAuditProducerService.interface";

interface BookingAuditTaskerProducerServiceDeps {
    tasker: Tasker;
    log: ISimpleLogger;
    auditActorRepository: IAuditActorRepository;
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
    private readonly auditActorRepository: IAuditActorRepository;

    constructor(private readonly deps: BookingAuditTaskerProducerServiceDeps) {
        this.tasker = deps.tasker;
        this.log = deps.log;
        this.auditActorRepository = deps.auditActorRepository;
    }

    /**
     * Producer-side actor resolution - creates PII-free actors for queueing
     * 
     * For guests: Creates AuditActor record in DB upfront, returns ActorById
     * For users/attendees: Returns ID-only actors
     * For system actors: Creates AuditActor record with .internal email convention, returns ActorById
     * 
     * Priority order: userUuid > attendeeId > systemActor > guestActor
     * 
     * Callers must provide userUuid (not userId) - if user is known, userUuid must be available
     * Callers must provide attendeeId if they want AttendeeActor - no automatic lookup
     * 
     * @param params.userUuid - User UUID (required, nullable)
     * @param params.attendeeId - Attendee ID (required, nullable)
     * @param params.systemActor - System actor info with identifier and name (required, nullable)
     * @param params.guestActor - Guest actor info with email and optional name (required, nullable)
     * @param params.auditActorRepository - Repository for creating actors
     * @returns Actor with no PII (only IDs)
     */
    private async getPIIFreeBookingAuditActor(params: {
        actor: Actor;
    }): Promise<PIIFreeActor> {
        const { actor } = params;

        if (actor.identifiedBy === "user" || actor.identifiedBy === "attendee" || actor.identifiedBy === "id") {
            return actor;
        }


        if (actor.identifiedBy === "system") {
            const email = buildActorEmail({ identifier: actor.identifier, actorType: "system" });
            const piiFreeActor = await this.auditActorRepository.createIfNotExistsSystemActor({
                email,
                name: actor.name,
            });
            return makeActorById(piiFreeActor.id);
        }

        if (actor.identifiedBy === "app") {
            const email = buildActorEmail({ identifier: actor.appSlug, actorType: "app" });
            const piiFreeActor = await this.auditActorRepository.createIfNotExistsAppActor({
                email,
                name: actor.name,
            });
            return makeActorById(piiFreeActor.id);
        }

        const piiFreeActor = await this.auditActorRepository.createIfNotExistsGuestActor({
            email: actor.email,
            name: actor.name ?? null,
            phone: null,
        });
        return makeActorById(piiFreeActor.id);
    }

    /**
     * Internal helper to queue audit task to Tasker
     * @param params.action - Must be a valid BookingAuditAction value (TYPE from action services are string-typed)
     * @param params.operationId - Optional operation ID for correlating bulk operations. If null, will be auto-generated.
     */
    private async queueTask(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        action: string;
        source: ActionSource;
        operationId?: string | null;
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
            const piiFreeActor = await this.getPIIFreeBookingAuditActor({
                actor: params.actor,
            });

            // Auto-generate operationId if not provided (for single operations)
            // For bulk operations, callers should provide the same operationId for correlation
            const operationId = params.operationId ?? uuidv4();

            // Cast action to BookingAuditAction since action service TYPE constants are typed as string
            await this.tasker.create("bookingAudit", {
                bookingUid: params.bookingUid,
                actor: piiFreeActor,
                organizationId: params.organizationId,
                timestamp: Date.now(),
                action: params.action as BookingAuditAction,
                source: params.source,
                operationId,
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
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
        source: ActionSource;
        operationId?: string | null;
        data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: AttendeeNoShowUpdatedAuditActionService.TYPE,
        });
    }

    async queueSeatBookedAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        source: ActionSource;
        operationId?: string | null;
        data: z.infer<typeof SeatBookedAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: SeatBookedAuditActionService.TYPE,
        });
    }

    async queueSeatRescheduledAudit(params: {
        bookingUid: string;
        actor: Actor;
        organizationId: number | null;
        source: ActionSource;
        operationId?: string | null;
        data: z.infer<typeof SeatRescheduledAuditActionService.latestFieldsSchema>;
    }): Promise<void> {
        await this.queueTask({
            ...params,
            action: SeatRescheduledAuditActionService.TYPE,
        });
    }
}
