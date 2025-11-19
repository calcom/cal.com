import type { JsonValue } from "@calcom/types/Json";

import logger from "@calcom/lib/logger";

import type { Actor } from "../../../bookings/lib/types/actor";
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

interface BookingAuditServiceDeps {
    bookingAuditRepository: IBookingAuditRepository;
    auditActorRepository: IAuditActorRepository;
}

type CreateBookingAuditInput = {
    bookingUid: string;
    linkedBookingUid?: string | null;
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
 * BookingAuditService - Central service for booking audit write operations
 * Handles audit creation (write operations only)
 * Read/display operations are handled by BookingAuditViewerService
 * Each action service manages its own schema versioning
 * 
 * Note: PENDING and AWAITING_HOST actions are intentionally not implemented.
 * These represent initial booking states captured by the CREATED action.
 */
export class BookingAuditService {
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

    constructor(private readonly deps: BookingAuditServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.auditActorRepository = deps.auditActorRepository;

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
            linkedBookingUid: input.linkedBookingUid,
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
        linkedBookingUid: string,
        actor: Actor,
        data: RescheduledAuditData
    ): Promise<BookingAudit> {
        const parsedData = this.rescheduledActionService.parseFields(data);
        const actorId = await this.resolveActorId(actor);
        return this.createAuditRecord({
            bookingUid,
            linkedBookingUid,
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
