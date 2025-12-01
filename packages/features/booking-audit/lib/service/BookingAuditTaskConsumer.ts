import type { JsonValue } from "@calcom/types/Json";

import logger from "@calcom/lib/logger";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

import type { Actor } from "../../../bookings/lib/types/actor";
import type { BookingAuditTaskConsumerPayload } from "../types/bookingAuditTask";
import { BookingAuditTaskConsumerPayloadSchema } from "../types/bookingAuditTask";
import { CreatedAuditActionService, type CreatedAuditData } from "../actions/CreatedAuditActionService";
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
    private readonly bookingAuditRepository: IBookingAuditRepository;
    private readonly auditActorRepository: IAuditActorRepository;
    private readonly featuresRepository: IFeaturesRepository;

    constructor(private readonly deps: BookingAuditTaskConsumerDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.auditActorRepository = deps.auditActorRepository;
        this.featuresRepository = deps.featuresRepository;

        // Each service instantiates its own helper with its specific schema
        this.createdActionService = new CreatedAuditActionService();
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
    async processAuditTask(payload: unknown, taskId: string): Promise<void> {
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

        if (action !== "CREATED") {
            throw new Error(`Unsupported audit action: ${action}`);
        }
        await this.onBookingCreated(bookingUid, actor, dataInLatestFormat);
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
        action: BookingAuditTaskConsumerPayload["action"];
        data: unknown;
        payload: BookingAuditTaskConsumerPayload;
        taskId: string;
    }) {
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
     * Get Action Service - Returns the appropriate action service for the given action type
     * 
     * @param action - The booking audit action type
     * @returns The corresponding action service instance
     */
    private getActionService(action: BookingAuditTaskConsumerPayload["action"]) {
        if (action !== "CREATED") {
            throw new Error(`Unsupported audit action: ${action}`);
        }
        return this.createdActionService;
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
        payload: BookingAuditTaskConsumerPayload,
        latestData: unknown,
        taskId: string
    ): Promise<void> {
        try {
            const { Task } = await import("@calcom/features/tasker/repository");

            const updatedPayload = { ...payload, data: latestData };

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
                const userActor = await this.auditActorRepository.upsertUserActor({ userUuid: actor.userUuid });
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
        action: BookingAuditAction,
        data: CreatedAuditData
    ): Promise<BookingAudit> {
        const versionedData = this.createdActionService.getVersionedData(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: "RECORD_CREATED",
            action: CreatedAuditActionService.TYPE,
            data: versionedData,
            timestamp: new Date(),
        });
    }
}

