import type { JsonValue } from "@calcom/types/Json";
import type { TFunction } from "next-i18next";

import logger from "@calcom/lib/logger";

import type { Actor } from "../../../bookings/lib/types/actor";
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
import { StatusChangeAuditActionService, type StatusChangeAuditData } from "../actions/StatusChangeAuditActionService";
import type { IAuditActorRepository } from "../repository/IAuditActorRepository";
import type { IBookingAuditRepository, BookingAuditType, BookingAuditAction } from "../repository/IBookingAuditRepository";

interface BookingAuditServiceDeps {
  bookingAuditRepository: IBookingAuditRepository;
  actorRepository: IAuditActorRepository;
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
 * BookingAuditService - Central service for all booking audit operations
 * Handles both write (audit creation) and read (display) operations
 * Each action service manages its own schema versioning
 */
export class BookingAuditService {
  private readonly createdActionService: CreatedAuditActionService;
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
  private readonly statusChangeActionService: StatusChangeAuditActionService;
  private readonly bookingAuditRepository: IBookingAuditRepository;
  private readonly actorRepository: IAuditActorRepository;

  constructor(private readonly deps: BookingAuditServiceDeps) {
    this.bookingAuditRepository = deps.bookingAuditRepository;
    this.actorRepository = deps.actorRepository;

    // Each service instantiates its own helper with its specific schema
    this.createdActionService = new CreatedAuditActionService();
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
    this.statusChangeActionService = new StatusChangeAuditActionService();
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
        const userActor = await this.actorRepository.upsertUserActor(actor.userUuid);
        return userActor.id;
      }
      case "attendee": {
        const attendeeActor = await this.actorRepository.findByAttendeeId(actor.attendeeId);
        if (!attendeeActor) {
          throw new Error(`Attendee actor not found for attendeeId: ${actor.attendeeId}`);
        }
        return attendeeActor.id;
      }
      case "guest": {
        const guestActor = await this.actorRepository.upsertGuestActor(
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
    logger.info("Creating audit record", { input });

    return this.bookingAuditRepository.create({
      bookingUid: input.bookingUid,
      actorId: input.actorId,
      type: input.type,
      action: input.action,
      timestamp: input.timestamp,
      data: input.data ?? null,
    });
  }

  // ============== WRITE OPERATIONS (Audit Creation) ==============

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
    data?: StatusChangeAuditData
  ): Promise<BookingAudit> {
    const parsedData = data ? this.statusChangeActionService.parseFields(data) : null;
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

  // ============== READ OPERATIONS (Display) ==============

  /**
   * Get human-readable display summary for audit entry (i18n-aware)
   */
  getDisplaySummary(audit: BookingAudit, t: TFunction): string {
    switch (audit.action) {
      case "CREATED": {
        const data = this.createdActionService.parseStored(audit.data);
        return this.createdActionService.getDisplaySummary(data, t);
      }
      case "ACCEPTED": {
        const data = this.statusChangeActionService.parseStored(audit.data);
        return this.statusChangeActionService.getDisplaySummary(data, t);
      }
      case "CANCELLED": {
        const data = this.cancelledActionService.parseStored(audit.data);
        return this.cancelledActionService.getDisplaySummary(data, t);
      }
      case "REJECTED": {
        const data = this.rejectedActionService.parseStored(audit.data);
        return this.rejectedActionService.getDisplaySummary(data, t);
      }
      case "RESCHEDULED": {
        const data = this.rescheduledActionService.parseStored(audit.data);
        return this.rescheduledActionService.getDisplaySummary(data, t);
      }
      case "RESCHEDULE_REQUESTED": {
        const data = this.rescheduleRequestedActionService.parseStored(audit.data);
        return this.rescheduleRequestedActionService.getDisplaySummary(data, t);
      }
      case "ATTENDEE_ADDED": {
        const data = this.attendeeAddedActionService.parseStored(audit.data);
        return this.attendeeAddedActionService.getDisplaySummary(data, t);
      }
      case "ATTENDEE_REMOVED": {
        const data = this.attendeeRemovedActionService.parseStored(audit.data);
        return this.attendeeRemovedActionService.getDisplaySummary(data, t);
      }
      case "REASSIGNMENT": {
        const data = this.reassignmentActionService.parseStored(audit.data);
        return this.reassignmentActionService.getDisplaySummary(data, t);
      }
      case "LOCATION_CHANGED": {
        const data = this.locationChangedActionService.parseStored(audit.data);
        return this.locationChangedActionService.getDisplaySummary(data, t);
      }
      case "HOST_NO_SHOW_UPDATED": {
        const data = this.hostNoShowUpdatedActionService.parseStored(audit.data);
        return this.hostNoShowUpdatedActionService.getDisplaySummary(data, t);
      }
      case "ATTENDEE_NO_SHOW_UPDATED": {
        const data = this.attendeeNoShowUpdatedActionService.parseStored(audit.data);
        return this.attendeeNoShowUpdatedActionService.getDisplaySummary(data, t);
      }
      default: {
        if (audit.type === "RECORD_CREATED") {
          const data = this.createdActionService.parseStored(audit.data);
          return this.createdActionService.getDisplaySummary(data, t);
        }
        return t("audit.action_performed");
      }
    }
  }

  /**
   * Get detailed key-value pairs for audit entry display
   */
  getDisplayDetails(audit: BookingAudit, t: TFunction): Record<string, string> {
    switch (audit.action) {
      case "CREATED": {
        const data = this.createdActionService.parseStored(audit.data);
        return this.createdActionService.getDisplayDetails(data, t);
      }
      case "ACCEPTED": {
        const data = this.statusChangeActionService.parseStored(audit.data);
        return this.statusChangeActionService.getDisplayDetails(data, t);
      }
      case "CANCELLED": {
        const data = this.cancelledActionService.parseStored(audit.data);
        return this.cancelledActionService.getDisplayDetails(data, t);
      }
      case "REJECTED": {
        const data = this.rejectedActionService.parseStored(audit.data);
        return this.rejectedActionService.getDisplayDetails(data, t);
      }
      case "RESCHEDULED": {
        const data = this.rescheduledActionService.parseStored(audit.data);
        return this.rescheduledActionService.getDisplayDetails(data, t);
      }
      case "RESCHEDULE_REQUESTED": {
        const data = this.rescheduleRequestedActionService.parseStored(audit.data);
        return this.rescheduleRequestedActionService.getDisplayDetails(data, t);
      }
      case "ATTENDEE_ADDED": {
        const data = this.attendeeAddedActionService.parseStored(audit.data);
        return this.attendeeAddedActionService.getDisplayDetails(data, t);
      }
      case "ATTENDEE_REMOVED": {
        const data = this.attendeeRemovedActionService.parseStored(audit.data);
        return this.attendeeRemovedActionService.getDisplayDetails(data, t);
      }
      case "REASSIGNMENT": {
        const data = this.reassignmentActionService.parseStored(audit.data);
        return this.reassignmentActionService.getDisplayDetails(data, t);
      }
      case "LOCATION_CHANGED": {
        const data = this.locationChangedActionService.parseStored(audit.data);
        return this.locationChangedActionService.getDisplayDetails(data, t);
      }
      case "HOST_NO_SHOW_UPDATED": {
        const data = this.hostNoShowUpdatedActionService.parseStored(audit.data);
        return this.hostNoShowUpdatedActionService.getDisplayDetails(data, t);
      }
      case "ATTENDEE_NO_SHOW_UPDATED": {
        const data = this.attendeeNoShowUpdatedActionService.parseStored(audit.data);
        return this.attendeeNoShowUpdatedActionService.getDisplayDetails(data, t);
      }
      default: {
        if (audit.type === "RECORD_CREATED") {
          const data = this.createdActionService.parseStored(audit.data);
          return this.createdActionService.getDisplayDetails(data, t);
        }
        return {};
      }
    }
  }
}
