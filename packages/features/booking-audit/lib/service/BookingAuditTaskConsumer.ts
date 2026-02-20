import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { JsonValue } from "@calcom/types/Json";
import type { BookingAuditContext, PiiFreeActor } from "../dto/types";
import type { IAuditActorRepository } from "../repository/IAuditActorRepository";
import type {
  BookingAuditAction,
  BookingAuditCreateInput,
  BookingAuditType,
  IBookingAuditRepository,
} from "../repository/IBookingAuditRepository";
import type { ActionSource } from "../types/actionSource";
import type {
  BookingAuditTaskConsumerPayload,
  BulkBookingAuditTaskConsumerPayload,
  SingleBookingAuditTaskConsumerPayload,
} from "../types/bookingAuditTask";
import { BookingAuditActionServiceRegistry } from "./BookingAuditActionServiceRegistry";

interface BookingAuditTaskConsumerDeps {
  bookingAuditRepository: IBookingAuditRepository;
  auditActorRepository: IAuditActorRepository;
  featuresRepository: IFeaturesRepository;
  attendeeRepository: IAttendeeRepository;
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
  context?: BookingAuditContext;
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

  constructor(deps: BookingAuditTaskConsumerDeps) {
    this.bookingAuditRepository = deps.bookingAuditRepository;
    this.auditActorRepository = deps.auditActorRepository;
    this.featuresRepository = deps.featuresRepository;

    this.actionServiceRegistry = new BookingAuditActionServiceRegistry();
  }

  /**
   * Process single booking Audit Task
   */
  async processAuditTask(payload: SingleBookingAuditTaskConsumerPayload): Promise<void> {
    const { action, bookingUid, actor, organizationId, data, timestamp, source, operationId, context } =
      payload;

    if (
      !(await this.shouldProcessAudit({
        organizationId,
        action,
        bookingUids: [bookingUid],
      }))
    ) {
      return;
    }

    const validatedData = this.validate({ action, data });

    await this.onBookingAction({
      bookingUid,
      actor,
      action,
      source,
      operationId,
      data: validatedData,
      timestamp,
      context,
    });
  }

  /**
   * Process Bulk bookings Audit Task
   */
  async processBulkAuditTask(payload: BulkBookingAuditTaskConsumerPayload): Promise<void> {
    const { bookings, action, actor, organizationId, timestamp, source, operationId, context } = payload;

    if (
      !(await this.shouldProcessAudit({
        organizationId,
        action,
        bookingUids: bookings.map((booking) => booking.bookingUid),
      }))
    ) {
      return;
    }

    const validatedBookings = this.bulkValidate({
      bookings,
      action,
    });

    await this.onBulkBookingActions({
      bookings: validatedBookings,
      actor,
      action,
      source,
      operationId,
      timestamp,
      context,
    });
  }

  /**
   * Validate data against latest schema for the given action.
   *
   * Task payloads are always created with the latest schema version,
   * so this simply validates the data without any migration logic.
   */
  private validate(params: { action: BookingAuditAction; data: unknown }): Record<string, unknown> {
    const { action, data } = params;
    const actionService = this.actionServiceRegistry.getActionService(action);
    return actionService.parse(data);
  }

  /**
   * Validate all bookings' data against latest schema in a bulk operation.
   *
   * Since all bookings in a bulk operation share the same action type,
   * they all use the same action service for validation.
   */
  private bulkValidate(params: {
    bookings: BulkBookingAuditTaskConsumerPayload["bookings"];
    action: BookingAuditAction;
  }): Array<{ bookingUid: string; data: Record<string, unknown> }> {
    const { bookings, action } = params;
    const actionService = this.actionServiceRegistry.getActionService(action);

    return bookings.map((booking) => ({
      bookingUid: booking.bookingUid,
      data: actionService.parse(booking.data),
    }));
  }

  /**
   * Check if audit should be processed based on organization and feature flag
   *
   * @param params - Organization ID, action, and context for logging
   * @returns true if audit should be processed, false otherwise
   */
  private async shouldProcessAudit(params: {
    organizationId: number | null;
    action: BookingAuditAction;
    bookingUids: string[];
  }): Promise<boolean> {
    const { organizationId, action, bookingUids } = params;

    if (organizationId === null) {
      logger.debug(
        `Skipping audit for non-organization booking: action=${action}, bookingUids=${bookingUids.join(",")}`
      );
      return false;
    }

    const isFeatureEnabled = await this.featuresRepository.checkIfTeamHasFeature(
      organizationId,
      "booking-audit"
    );

    if (!isFeatureEnabled) {
      logger.debug(
        `booking-audit feature is disabled for organization: action=${action}, bookingUids=${bookingUids.join(",")}, organizationId=${organizationId}`
      );
      return false;
    }

    return true;
  }

  /**
   * Resolves an Actor to an actor ID in the AuditActor table
   * Handles different actor types appropriately (upsert, lookup, or direct ID)
   */
  private async resolveActorId(actor: PiiFreeActor): Promise<string> {
    switch (actor.identifiedBy) {
      case "id":
        return actor.id;
      case "user": {
        const userActor = await this.auditActorRepository.createIfNotExistsUserActor({
          userUuid: actor.userUuid,
        });
        return userActor.id;
      }
      case "attendee": {
        const attendeeActor = await this.auditActorRepository.createIfNotExistsAttendeeActor({
          attendeeId: actor.attendeeId,
        });
        return attendeeActor.id;
      }
    }
  }

  /**
   * Creates a booking audit record
   * Action services handle their own version wrapping
   */
  private async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
    logger.info(
      "Creating audit record",
      safeStringify({
        bookingUid: input.bookingUid,
        actorId: input.actorId,
        type: input.type,
        action: input.action,
        source: input.source,
        timestamp: input.timestamp,
        context: input.context,
      })
    );

    return this.bookingAuditRepository.create({
      bookingUid: input.bookingUid,
      actorId: input.actorId,
      type: input.type,
      action: input.action,
      source: input.source,
      timestamp: input.timestamp,
      operationId: input.operationId,
      data: input.data ?? null,
      context: input.context,
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
      case "NO_SHOW_UPDATED":
      case "SEAT_BOOKED":
      case "SEAT_RESCHEDULED":
        return "RECORD_UPDATED";

      // PENDING and AWAITING_HOST are not implemented as they represent initial states
      case "PENDING":
      case "AWAITING_HOST":
        throw new Error(
          `Action ${action} is not supported - it represents an initial booking state captured by CREATED`
        );
    }
  }

  private async onBulkBookingActions(params: {
    bookings: Array<{ bookingUid: string; data: Record<string, unknown> }>;
    actor: PiiFreeActor;
    action: BookingAuditAction;
    source: ActionSource;
    operationId: string;
    timestamp: number;
    context?: BookingAuditContext;
  }): Promise<void> {
    const { bookings, actor, action, source, operationId, timestamp, context } = params;

    const actorId = await this.resolveActorId(actor);
    const recordType = this.getRecordType({ action });
    const actionService = this.actionServiceRegistry.getActionService(action);

    const auditRecordsToCreate: BookingAuditCreateInput[] = bookings.map((booking) => {
      const versionedData = actionService.getVersionedData(booking.data);
      return {
        bookingUid: booking.bookingUid,
        actorId,
        type: recordType,
        action,
        source,
        operationId,
        data: versionedData as JsonValue,
        timestamp: new Date(timestamp),
        context,
      };
    });

    await this.bookingAuditRepository.createMany(auditRecordsToCreate);

    logger.info(
      `Successfully created ${auditRecordsToCreate.length} bulk audit records: action=${action}, operationId=${operationId}`
    );
  }

  async onBookingAction(params: {
    bookingUid: string;
    actor: PiiFreeActor;
    action: BookingAuditAction;
    source: ActionSource;
    operationId: string;
    data: Record<string, unknown>;
    timestamp: number;
    context?: BookingAuditContext;
  }): Promise<BookingAudit> {
    const { bookingUid, actor, action, source, operationId, data, timestamp, context } = params;
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
      context,
    });
  }
}
