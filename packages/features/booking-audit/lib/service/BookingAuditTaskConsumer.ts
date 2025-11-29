import type { JsonValue } from "@calcom/types/Json";

import logger from "@calcom/lib/logger";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

import type { Actor } from "../../../bookings/lib/types/actor";
import type { BookingAuditTaskPayload } from "../types/bookingAuditTask";
import { BookingAuditTaskConsumerPayloadSchema } from "../types/bookingAuditTask";
import { AcceptedAuditActionService, type AcceptedAuditData } from "../actions/AcceptedAuditActionService";
import { AttendeeAddedAuditActionService, type AttendeeAddedAuditData } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService, type AttendeeNoShowUpdatedAuditData } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { AttendeeRemovedAuditActionService, type AttendeeRemovedAuditData } from "../actions/AttendeeRemovedAuditActionService";
import { CancelledAuditActionService, type CancelledAuditData } from "../actions/CancelledAuditActionService";
import { CreatedAuditActionService, type CreatedAuditData } from "../actions/CreatedAuditActionService";
import { HostNoShowUpdatedAuditActionService, type HostNoShowUpdatedAuditData } from "../actions/HostNoShowUpdatedAuditActionService";
import { LocationChangedAuditActionService, type LocationChangedAuditData } from "../actions/LocationChangedAuditActionService";
import { ReassignmentAuditActionService, type ReassignmentAuditData } from "../actions/ReassignmentAuditActionService";
import { RejectedAuditActionService, type RejectedAuditData } from "../actions/RejectedAuditActionService";
import { RescheduleRequestedAuditActionService, type RescheduleRequestedAuditData } from "../actions/RescheduleRequestedAuditActionService";
import { RescheduledAuditActionService, type RescheduledAuditData } from "../actions/RescheduledAuditActionService";
import type { IBookingAuditRepository, BookingAuditType, BookingAuditAction } from "../repository/IBookingAuditRepository";
import type { IAuditActorRepository } from "../repository/IAuditActorRepository";
import { safeStringify } from "@calcom/lib/safeStringify";

interface BookingAuditTaskConsumerDeps {
    bookingAuditRepository: IBookingAuditRepository;
    auditActorRepository: IAuditActorRepository;
    featuresRepository: IFeaturesRepository;
}

type CreateBookingAuditInput = {
    bookingUid: string;
    actorId: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    data: JsonValue;
    timestamp: Date; // Required: actual time of the booking change (business event)
};

type BookingAudit = {
    id: string;
    bookingUid: string;
    actorId: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    data: JsonValue;
};

/**
 * BookingAuditTaskConsumer - Task consumer for processing booking audit tasks
 * Handles all audit processing logic including feature flag checks and routing to action handlers
 * Designed to be deployed separately (e.g., as trigger.dev job) with minimal dependencies
 * 
 * Note: PENDING and AWAITING_HOST actions are intentionally not implemented.
 * These represent initial booking states captured by the CREATED action.
 */
export class BookingAuditTaskConsumer {
    private readonly createdActionService: CreatedAuditActionService;
    private readonly acceptedActionService: AcceptedAuditActionService;
    private readonly cancelledActionService: CancelledAuditActionService;
    private readonly rejectedActionService: RejectedAuditActionService;
    private readonly rescheduledActionService: RescheduledAuditActionService;
    private readonly rescheduleRequestedActionService: RescheduleRequestedAuditActionService;
    private readonly attendeeAddedActionService: AttendeeAddedAuditActionService;
    private readonly attendeeRemovedActionService: AttendeeRemovedAuditActionService;
    private readonly reassignmentActionService: ReassignmentAuditActionService;
    private readonly locationChangedActionService: LocationChangedAuditActionService;
    private readonly hostNoShowUpdatedActionService: HostNoShowUpdatedAuditActionService;
    private readonly attendeeNoShowUpdatedActionService: AttendeeNoShowUpdatedAuditActionService;
    private readonly bookingAuditRepository: IBookingAuditRepository;
    private readonly auditActorRepository: IAuditActorRepository;
    private readonly featuresRepository: IFeaturesRepository;

    constructor(private readonly deps: BookingAuditTaskConsumerDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.auditActorRepository = deps.auditActorRepository;
        this.featuresRepository = deps.featuresRepository;

        // Each service instantiates its own helper with its specific schema
        this.createdActionService = new CreatedAuditActionService();
        this.acceptedActionService = new AcceptedAuditActionService();
        this.cancelledActionService = new CancelledAuditActionService();
        this.rejectedActionService = new RejectedAuditActionService();
        this.rescheduledActionService = new RescheduledAuditActionService();
        this.rescheduleRequestedActionService = new RescheduleRequestedAuditActionService();
        this.attendeeAddedActionService = new AttendeeAddedAuditActionService();
        this.attendeeRemovedActionService = new AttendeeRemovedAuditActionService();
        this.reassignmentActionService = new ReassignmentAuditActionService();
        this.locationChangedActionService = new LocationChangedAuditActionService();
        this.hostNoShowUpdatedActionService = new HostNoShowUpdatedAuditActionService();
        this.attendeeNoShowUpdatedActionService = new AttendeeNoShowUpdatedAuditActionService();
    }

    /**
     * Process Audit Task - Entry point for task handler
     * 
     * This method handles:
     * 1. Schema validation (accepts all supported versions)
     * 2. Feature flag checks
     * 3. Schema migration to latest version if needed
     * 4. Routing to appropriate action handlers
     * 
     * Schema Migration:
     * - Validates payload against all supported schema versions
     * - Migrates old versions to latest at task boundary
     * - Updates task payload in DB if migration occurs
     * - Ensures retries always use latest schema version
     * 
     * @param payload - The booking audit task payload (unknown type, will be validated)
     * @param taskId - Optional task ID for updating migrated payload in DB
     * @returns Promise that resolves when processing is complete
     */
    async processAuditTask(payload: unknown, taskId?: string): Promise<void> {
        // Validate payload schema (accepts all supported versions)
        const parseResult = BookingAuditTaskConsumerPayloadSchema.safeParse(payload);

        if (!parseResult.success) {
            const errorMsg = `Invalid booking audit payload: ${safeStringify(parseResult.error.errors)}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        const validatedPayload = parseResult.data;
        const { action, bookingUid, actor, organizationId, data } = validatedPayload;

        // Skip processing for non-organization bookings
        if (organizationId === null) {
            logger.info(
                `Skipping audit for non-organization booking: action=${action}, bookingUid=${bookingUid}`
            );
            return;
        }

        const isFeatureEnabled = await this.featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit");

        if (!isFeatureEnabled) {
            logger.info(
                `booking-audit feature is disabled for organization, skipping audit processing: action=${action}, bookingUid=${bookingUid}, organizationId=${organizationId}`
            );
            return;
        }

        const dataInLatestFormat = await this.migrateIfNeeded({ action, data, payload: validatedPayload, taskId });

        // Route to appropriate handler based on action type
        switch (action) {
            case "CREATED":
                await this.onBookingCreated(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "ACCEPTED":
                await this.onBookingAccepted(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "CANCELLED":
                await this.onBookingCancelled(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "REJECTED":
                await this.onBookingRejected(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "RESCHEDULED":
                await this.onBookingRescheduled(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "RESCHEDULE_REQUESTED":
                await this.onRescheduleRequested(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "ATTENDEE_ADDED":
                await this.onAttendeeAdded(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "ATTENDEE_REMOVED":
                await this.onAttendeeRemoved(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "REASSIGNMENT":
                await this.onReassignment(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "LOCATION_CHANGED":
                await this.onLocationChanged(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "HOST_NO_SHOW_UPDATED":
                await this.onHostNoShowUpdated(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            case "ATTENDEE_NO_SHOW_UPDATED":
                await this.onAttendeeNoShowUpdated(bookingUid, actor, this.getActionData(action, dataInLatestFormat));
                break;
            default: {
                // TypeScript ensures this is exhaustive
                const _exhaustiveCheck: never = action;
                throw new Error(`Unknown audit action: ${_exhaustiveCheck}`);
            }
        }
    }

    /**
     * Migrate If Needed - Migrates data to latest version
     * 
     * Calls the action service's migrateToLatest method which:
     * - Validates the data against all supported versions
     * - Migrates to latest version if needed
     * - Returns validated data with migration status
     * 
     * If migration occurred, updates the task payload in DB for retries.
     */
    private async migrateIfNeeded(params: {
        action: BookingAuditTaskPayload["action"];
        data: unknown;
        payload: BookingAuditTaskPayload;
        taskId?: string;
    }): Promise<unknown> {
        const { action, data, payload, taskId } = params;
        const actionService = this.getActionService(action);

        // migrateToLatest is now required - validates and migrates if needed
        const migrationResult = actionService.migrateToLatest(data);

        // If migrated, update task payload in DB
        if (migrationResult.isMigrated) {
            logger.info(
                `Schema migration performed: action=${action}`
            );
            await this.updateTaskPayload(payload, migrationResult.latestData, taskId);
        }

        return migrationResult.latestData;
    }

    /**
     * Get Action Data - Type-safe helper to narrow migrated data to specific action type
     * 
     * TypeScript can't narrow discriminated unions across variable assignments.
     * This helper provides proper type narrowing via function overloads.
     * The cast is safe because migrateIfNeeded ensures data matches the action's schema.
     */
    private getActionData(action: "CREATED", data: unknown): CreatedAuditData;
    private getActionData(action: "ACCEPTED", data: unknown): AcceptedAuditData | undefined;
    private getActionData(action: "CANCELLED", data: unknown): CancelledAuditData;
    private getActionData(action: "REJECTED", data: unknown): RejectedAuditData;
    private getActionData(action: "RESCHEDULED", data: unknown): RescheduledAuditData;
    private getActionData(action: "RESCHEDULE_REQUESTED", data: unknown): RescheduleRequestedAuditData;
    private getActionData(action: "ATTENDEE_ADDED", data: unknown): AttendeeAddedAuditData;
    private getActionData(action: "ATTENDEE_REMOVED", data: unknown): AttendeeRemovedAuditData;
    private getActionData(action: "REASSIGNMENT", data: unknown): ReassignmentAuditData;
    private getActionData(action: "LOCATION_CHANGED", data: unknown): LocationChangedAuditData;
    private getActionData(action: "HOST_NO_SHOW_UPDATED", data: unknown): HostNoShowUpdatedAuditData;
    private getActionData(action: "ATTENDEE_NO_SHOW_UPDATED", data: unknown): AttendeeNoShowUpdatedAuditData;
    private getActionData(action: BookingAuditTaskPayload["action"], data: unknown): unknown {
        return data;
    }

    /**
     * Get Action Service - Returns the appropriate action service for the given action type
     * 
     * @param action - The booking audit action type
     * @returns The corresponding action service instance
     */
    private getActionService(action: BookingAuditTaskPayload["action"]) {
        switch (action) {
            case "CREATED":
                return this.createdActionService;
            case "ACCEPTED":
                return this.acceptedActionService;
            case "CANCELLED":
                return this.cancelledActionService;
            case "REJECTED":
                return this.rejectedActionService;
            case "RESCHEDULED":
                return this.rescheduledActionService;
            case "RESCHEDULE_REQUESTED":
                return this.rescheduleRequestedActionService;
            case "ATTENDEE_ADDED":
                return this.attendeeAddedActionService;
            case "ATTENDEE_REMOVED":
                return this.attendeeRemovedActionService;
            case "REASSIGNMENT":
                return this.reassignmentActionService;
            case "LOCATION_CHANGED":
                return this.locationChangedActionService;
            case "HOST_NO_SHOW_UPDATED":
                return this.hostNoShowUpdatedActionService;
            case "ATTENDEE_NO_SHOW_UPDATED":
                return this.attendeeNoShowUpdatedActionService;
            default: {
                const _exhaustiveCheck: never = action;
                throw new Error(`Unknown audit action: ${_exhaustiveCheck}`);
            }
        }
    }

    /**
     * Update Task Payload - Updates the task payload in DB with migrated data
     * 
     * This ensures that task retries use the latest schema version.
     * When a task fails and retries, it will use the already-migrated payload.
     * 
     * @param payload - Original task payload
     * @param latestData - Migrated data in latest schema version
     * @param taskId - Task ID (required for DB update)
     */
    private async updateTaskPayload(
        payload: BookingAuditTaskPayload,
        latestData: unknown,
        taskId?: string
    ): Promise<void> {
        if (!taskId) {
            logger.warn(
                "Task ID not provided - cannot update task payload in DB. " +
                "Task retries will use original schema."
            );
            return;
        }

        try {
            // Import Task repository dynamically to avoid circular dependencies
            const { Task } = await import("@calcom/features/tasker/repository");

            // Create updated payload with migrated data
            const updatedPayload = { ...payload, data: latestData };

            // Update the task in DB
            await Task.updatePayload(taskId, JSON.stringify(updatedPayload));

            logger.info(
                `Successfully updated task payload in DB: taskId=${taskId}, action=${payload.action}`
            );
        } catch (error) {
            // Log error but don't fail the task - migration happened in memory
            logger.error(
                `Failed to update task payload in DB: taskId=${taskId}, error=${safeStringify(error)}`
            );
        }
    }

    /**
     * Resolves an Actor to an actor ID in the AuditActor table
     * Handles different actor types appropriately (upsert, lookup, or direct ID)
     */
    private async resolveActorId(actor: Actor): Promise<string> {
        switch (actor.identifiedBy) {
            case "id":
                return actor.id;
            case "user": {
                const userActor = await this.auditActorRepository.upsertUserActor(actor.userUuid);
                return userActor.id;
            }
            case "attendee": {
                const attendeeActor = await this.auditActorRepository.findByAttendeeId(actor.attendeeId);
                if (!attendeeActor) {
                    throw new Error(`Attendee actor not found for attendeeId: ${actor.attendeeId}`);
                }
                return attendeeActor.id;
            }
            case "guest": {
                const guestActor = await this.auditActorRepository.upsertGuestActor(
                    actor.email ?? "",
                    actor.name,
                    actor.phone
                );
                return guestActor.id;
            }
        }
    }

    /**
     * Creates a booking audit record
     * Action services handle their own version wrapping
     */
    private async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
        logger.info("Creating audit record", safeStringify({
            bookingUid: input.bookingUid,
            actorId: input.actorId,
            type: input.type,
            action: input.action,
            timestamp: input.timestamp,
        }));

        return this.bookingAuditRepository.create({
            bookingUid: input.bookingUid,
            actorId: input.actorId,
            type: input.type,
            action: input.action,
            timestamp: input.timestamp,
            data: input.data ?? null,
        });
    }

    async onBookingCreated(
        bookingUid: string,
        actor: Actor,
        data: CreatedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.createdActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_CREATED",
            action: "CREATED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onBookingAccepted(
        bookingUid: string,
        actor: Actor,
        data?: AcceptedAuditData
    ): Promise<BookingAudit> {
        const parsedData = data ? this.acceptedActionService.parseFields(data) : null;
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "ACCEPTED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onBookingRejected(
        bookingUid: string,
        actor: Actor,
        data: RejectedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.rejectedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "REJECTED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onBookingCancelled(
        bookingUid: string,
        actor: Actor,
        data: CancelledAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.cancelledActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "CANCELLED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onBookingRescheduled(
        bookingUid: string,
        actor: Actor,
        data: RescheduledAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.rescheduledActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "RESCHEDULED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onRescheduleRequested(
        bookingUid: string,
        actor: Actor,
        data: RescheduleRequestedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.rescheduleRequestedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "RESCHEDULE_REQUESTED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onAttendeeAdded(
        bookingUid: string,
        actor: Actor,
        data: AttendeeAddedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.attendeeAddedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "ATTENDEE_ADDED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onAttendeeRemoved(
        bookingUid: string,
        actor: Actor,
        data: AttendeeRemovedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.attendeeRemovedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "ATTENDEE_REMOVED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onReassignment(
        bookingUid: string,
        actor: Actor,
        data: ReassignmentAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.reassignmentActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "REASSIGNMENT",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onLocationChanged(
        bookingUid: string,
        actor: Actor,
        data: LocationChangedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.locationChangedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "LOCATION_CHANGED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onHostNoShowUpdated(
        bookingUid: string,
        actor: Actor,
        data: HostNoShowUpdatedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.hostNoShowUpdatedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "HOST_NO_SHOW_UPDATED",
            data: parsedData,
            timestamp: new Date(),
        });
    }

    async onAttendeeNoShowUpdated(
        bookingUid: string,
        actor: Actor,
        data: AttendeeNoShowUpdatedAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.attendeeNoShowUpdatedActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_UPDATED",
            action: "ATTENDEE_NO_SHOW_UPDATED",
            data: parsedData,
            timestamp: new Date(),
        });
    }
}

