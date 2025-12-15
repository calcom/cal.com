import type { JsonValue } from "@calcom/types/Json";

import logger from "@calcom/lib/logger";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import type { PIIFreeActor } from "../../../bookings/lib/types/actor";
import type { BookingAuditTaskConsumerPayload } from "../types/bookingAuditTask";
import { BookingAuditTaskConsumerSchema } from "../types/bookingAuditTask";
import { BookingAuditActionServiceRegistry } from "./BookingAuditActionServiceRegistry";
import type { IBookingAuditRepository, BookingAuditType, BookingAuditAction } from "../repository/IBookingAuditRepository";
import type { IAuditActorRepository } from "../repository/IAuditActorRepository";
import type { ActionSource } from "../common/actionSource";
import { safeStringify } from "@calcom/lib/safeStringify";

interface BookingAuditTaskConsumerDeps {
    bookingAuditRepository: IBookingAuditRepository;
    auditActorRepository: IAuditActorRepository;
    featuresRepository: IFeaturesRepository;
    userRepository: UserRepository;
}

type CreateBookingAuditInput = {
    bookingUid: string;
    actorId: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    source: ActionSource;
    operationId: string;
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
 * 
 * Dependency Injection Note:
 * - `userRepository` is included in this service's dependencies because it's required by
 *   ActionServices (e.g., ReassignmentAuditActionService) that need to fetch user data.
 * - Currently, dependencies are passed down the flow: TaskConsumer → Registry → ActionService
 * - Future improvement: Consider creating a container/module system for action services
 *   that can build instances directly with their dependencies, eliminating the need to
 *   pass dependencies through intermediate layers.
 */
export class BookingAuditTaskConsumer {
    private readonly actionServiceRegistry: BookingAuditActionServiceRegistry;
    private readonly bookingAuditRepository: IBookingAuditRepository;
    private readonly auditActorRepository: IAuditActorRepository;
    private readonly featuresRepository: IFeaturesRepository;
    private readonly userRepository: UserRepository;

    constructor(private readonly deps: BookingAuditTaskConsumerDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.auditActorRepository = deps.auditActorRepository;
        this.featuresRepository = deps.featuresRepository;
        this.userRepository = deps.userRepository;

        // Centralized registry for all action services
        this.actionServiceRegistry = new BookingAuditActionServiceRegistry({ userRepository: this.userRepository });
    }

    /**
     * Process Audit Task - Entry point for task handler
     * 
     * This method handles:
     * 1. Base schema validation (parses data as unknown)
     * 2. Feature flag checks
     * 3. Action-specific data validation and migration
     * 4. Routing to appropriate action handlers
     * 
     * Two-Stage Parsing:
     * - First validates base fields with lean schema (data as unknown)
     * - Then validates data with action-specific schema via action service
     * - This avoids large discriminated unions for better TypeScript performance
     * 
     * @param payload - The booking audit task payload (unknown type, will be validated)
     * @param taskId - Optional task ID for updating migrated payload in DB
     * @returns Promise that resolves when processing is complete
     */
    async processAuditTask(payload: unknown, taskId: string): Promise<void> {
        // Step 1: Parse with lean base schema (data as unknown)
        const parseResult = BookingAuditTaskConsumerSchema.safeParse(payload);

        if (!parseResult.success) {
            const errorMsg = `Invalid booking audit payload: ${safeStringify(parseResult.error.errors)}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        const validatedPayload = parseResult.data;
        const { action, bookingUid, actor, organizationId, data, timestamp, source, operationId } = validatedPayload;

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

        // Step 2: Validate and migrate data with action-specific schema
        const dataInLatestFormat = await this.migrateIfNeeded({ action, data, payload: validatedPayload, taskId });

        // dataInLatestFormat is validated by action-specific schema in migrateIfNeeded
        await this.onBookingAction({ bookingUid, actor, action, source, operationId, data: dataInLatestFormat, timestamp });
    }

    /**
     * Migrate If Needed - Validates and migrates data to latest version
     * 
     * This is where action-specific data validation happens.
     * The action service's migrateToLatest method:
     * - Validates the data against all supported versions
     * - Migrates to latest version if needed
     * - Returns validated data with migration status
     * 
     * If migration occurred, updates the task payload in DB for retries.
     */
    private async migrateIfNeeded(params: {
        action: BookingAuditAction;
        data: unknown;
        payload: BookingAuditTaskConsumerPayload;
        taskId: string;
    }) {
        const { action, data, payload, taskId } = params;
        const actionService = this.actionServiceRegistry.getActionService(action);

        // migrateToLatest validates data with action-specific schema and migrates if needed
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
    private async resolveActorId(actor: PIIFreeActor): Promise<string> {
        switch (actor.identifiedBy) {
            case "id":
                return actor.id;
            case "user": {
                const userActor = await this.auditActorRepository.createIfNotExistsUserActor({ userUuid: actor.userUuid });
                return userActor.id;
            }
            case "attendee": {
                const attendeeActor = await this.auditActorRepository.createIfNotExistsAttendeeActor({ attendeeId: actor.attendeeId });
                return attendeeActor.id;
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
            source: input.source,
            timestamp: input.timestamp,
        }));

        return this.bookingAuditRepository.create({
            bookingUid: input.bookingUid,
            actorId: input.actorId,
            type: input.type,
            action: input.action,
            source: input.source,
            timestamp: input.timestamp,
            data: input.data ?? null,
        });
    }

    /**
     * Get Record Type - Derives the record type from the action
     * 
     * Maps booking actions to their corresponding audit record types:
     * - CREATED → RECORD_CREATED
     * - All other actions (CANCELLED, RESCHEDULED, etc.) → RECORD_UPDATED
     * - Future actions like DELETED → RECORD_DELETED
     * 
     * @param action - The booking audit action
     * @returns The corresponding record type
     */
    private getRecordType(params: { action: BookingAuditAction }): BookingAuditType {
        const { action } = params;


        switch (action) {
            case "CREATED":
                return "RECORD_CREATED";

            // All update actions fall through to return RECORD_UPDATED
            case "CANCELLED":
            case "ACCEPTED":
            case "REJECTED":
            case "RESCHEDULED":
            case "RESCHEDULE_REQUESTED":
            case "ATTENDEE_ADDED":
            case "ATTENDEE_REMOVED":
            case "REASSIGNMENT":
            case "LOCATION_CHANGED":
            case "HOST_NO_SHOW_UPDATED":
            case "ATTENDEE_NO_SHOW_UPDATED":
            case "SEAT_BOOKED":
            case "SEAT_RESCHEDULED":
                return "RECORD_UPDATED";

            // PENDING and AWAITING_HOST are not implemented as they represent initial states
            case "PENDING":
            case "AWAITING_HOST":
                throw new Error(`Action ${action} is not supported - it represents an initial booking state captured by CREATED`);
        }
    }

    async onBookingAction(params: {
        bookingUid: string;
        actor: PIIFreeActor;
        action: BookingAuditAction;
        source: ActionSource;
        operationId: string;
        data: Record<string, unknown>;
        timestamp: number;
    }): Promise<BookingAudit> {
        const { bookingUid, actor, action, source, operationId, data, timestamp } = params;
        const actionService = this.actionServiceRegistry.getActionService(action);
        const versionedData = actionService.getVersionedData(data);
        const actorId = await this.resolveActorId(actor);
        const recordType = this.getRecordType({ action });

        return this.createAuditRecord({
            bookingUid,
            actorId,
            type: recordType,
            action,
            source,
            operationId,
            // versionedData is { version: number; fields: unknown } which is JsonValue-compatible
            data: versionedData as JsonValue,
            timestamp: new Date(timestamp),
        });
    }
}

