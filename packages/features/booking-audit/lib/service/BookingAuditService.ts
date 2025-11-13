import type { TFunction } from "next-i18next";

import type { BookingAudit, BookingAuditType, BookingAuditAction, Prisma } from "@calcom/prisma/client";
import logger from "@calcom/lib/logger";
interface BookingAuditServiceDeps {
  bookingAuditRepository: IBookingAuditRepository;
  actorRepository: IActorRepository;
}

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
import { StatusChangeAuditActionService } from "../actions/StatusChangeAuditActionService";
import type { IActorRepository } from "../repository/IActorRepository";
import type { IBookingAuditRepository } from "../repository/IBookingAuditRepository";
import type {
  CreatedAuditData,
  CancelledAuditData,
  RejectedAuditData,
  RescheduledAuditData,
  RescheduleRequestedAuditData,
  AttendeeAddedAuditData,
  AttendeeRemovedAuditData,
  ReassignmentAuditData,
  LocationChangedAuditData,
  HostNoShowUpdatedAuditData,
  AttendeeNoShowUpdatedAuditData,
  StatusChangeAuditData,
} from "../types";

type CreateBookingAuditInput = {
  bookingId: string;
  actorId: string;
  type: BookingAuditType;
  action: BookingAuditAction;
  data?: unknown;
  timestamp: Date; // Required: actual time of the booking change (business event)
};

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

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
  private readonly actorRepository: IActorRepository;

  constructor(private readonly deps: BookingAuditServiceDeps) {
    this.bookingAuditRepository = deps.bookingAuditRepository;
    this.actorRepository = deps.actorRepository;
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

  private async getOrCreateUserActor(userId: number): Promise<string> {
    const actor = await this.actorRepository.upsertUserActor(userId);
    return actor.id;
  }

  /**
   * Creates a booking audit record
   * Action services handle their own version wrapping
   */
  private async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
    logger.info("Creating audit record", { input });
    const auditData: Prisma.BookingAuditCreateInput = {
      bookingId: input.bookingId,
      actor: {
        connect: {
          id: input.actorId,
        },
      },
      type: input.type,
      action: input.action,
      timestamp: input.timestamp, // Actual time of the booking change
      data: input.data as Prisma.InputJsonValue,
    };

    return this.bookingAuditRepository.create(auditData);
  }

  // ============== WRITE OPERATIONS (Audit Creation) ==============

  async onBookingCreated(
    bookingId: string,
    userId: number | undefined,
    data: CreatedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.createdActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_CREATED",
      action: "CREATED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onBookingAccepted(
    bookingId: string,
    userId: number | undefined,
    data?: StatusChangeAuditData
  ): Promise<BookingAudit> {
    const parsedData = data ? this.statusChangeActionService.parse(data) : undefined;
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ACCEPTED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onBookingRejected(
    bookingId: string,
    userId: number | undefined,
    data: RejectedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.rejectedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "REJECTED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onBookingCancelled(
    bookingId: string,
    userId: number | undefined,
    data: CancelledAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.cancelledActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "CANCELLED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onBookingRescheduled(
    bookingId: string,
    userId: number | undefined,
    data: RescheduledAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.rescheduledActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "RESCHEDULED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onRescheduleRequested(
    bookingId: string,
    userId: number | undefined,
    data: RescheduleRequestedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.rescheduleRequestedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "RESCHEDULE_REQUESTED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onAttendeeAdded(
    bookingId: string,
    userId: number | undefined,
    data: AttendeeAddedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.attendeeAddedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ATTENDEE_ADDED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onAttendeeRemoved(
    bookingId: string,
    userId: number | undefined,
    data: AttendeeRemovedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.attendeeRemovedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ATTENDEE_REMOVED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onReassignment(
    bookingId: string,
    userId: number | undefined,
    data: ReassignmentAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.reassignmentActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "REASSIGNMENT",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onLocationChanged(
    bookingId: string,
    userId: number | undefined,
    data: LocationChangedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.locationChangedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "LOCATION_CHANGED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onHostNoShowUpdated(
    bookingId: string,
    userId: number | undefined,
    data: HostNoShowUpdatedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.hostNoShowUpdatedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "HOST_NO_SHOW_UPDATED",
      data: parsedData,
      timestamp: new Date(),
    });
  }

  async onAttendeeNoShowUpdated(
    bookingId: string,
    userId: number | undefined,
    data: AttendeeNoShowUpdatedAuditData
  ): Promise<BookingAudit> {
    const parsedData = this.attendeeNoShowUpdatedActionService.parse(data);
    const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
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
