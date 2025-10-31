import type { BookingAudit, BookingAuditType, BookingAuditAction, Prisma } from "@calcom/prisma/client";
import type { TFunction } from "next-i18next";

import type { IActorRepository } from "../repository/IActorRepository";
import type { IBookingAuditRepository } from "../repository/IBookingAuditRepository";
import { PrismaActorRepository } from "../repository/PrismaActorRepository";
import { PrismaBookingAuditRepository } from "../repository/PrismaBookingAuditRepository";
import type {
    CreatedAuditData,
    CancelledAuditData,
    RejectedAuditData,
    RescheduledAuditData,
    RescheduleRequestedAuditData,
    AttendeeAddedAuditData,
    AttendeeRemovedAuditData,
    ReassignmentAuditData,
    AssignmentAuditData,
    CancellationReasonUpdatedAuditData,
    RejectionReasonUpdatedAuditData,
    LocationChangedAuditData,
    MeetingUrlUpdatedAuditData,
    HostNoShowUpdatedAuditData,
    AttendeeNoShowUpdatedAuditData,
    StatusChangeAuditData,
} from "../types";
import { CreatedAuditActionHelperService } from "../actions/CreatedAuditActionHelperService";
import { CancelledAuditActionHelperService } from "../actions/CancelledAuditActionHelperService";
import { RejectedAuditActionHelperService } from "../actions/RejectedAuditActionHelperService";
import { RescheduledAuditActionHelperService } from "../actions/RescheduledAuditActionHelperService";
import { RescheduleRequestedAuditActionHelperService } from "../actions/RescheduleRequestedAuditActionHelperService";
import { AttendeeAddedAuditActionHelperService } from "../actions/AttendeeAddedAuditActionHelperService";
import { AttendeeRemovedAuditActionHelperService } from "../actions/AttendeeRemovedAuditActionHelperService";
import { ReassignmentAuditActionHelperService } from "../actions/ReassignmentAuditActionHelperService";
import { AssignmentAuditActionHelperService } from "../actions/AssignmentAuditActionHelperService";
import { CancellationReasonUpdatedAuditActionHelperService } from "../actions/CancellationReasonUpdatedAuditActionHelperService";
import { RejectionReasonUpdatedAuditActionHelperService } from "../actions/RejectionReasonUpdatedAuditActionHelperService";
import { LocationChangedAuditActionHelperService } from "../actions/LocationChangedAuditActionHelperService";
import { MeetingUrlUpdatedAuditActionHelperService } from "../actions/MeetingUrlUpdatedAuditActionHelperService";
import { HostNoShowUpdatedAuditActionHelperService } from "../actions/HostNoShowUpdatedAuditActionHelperService";
import { AttendeeNoShowUpdatedAuditActionHelperService } from "../actions/AttendeeNoShowUpdatedAuditActionHelperService";
import { StatusChangeAuditActionHelperService } from "../actions/StatusChangeAuditActionHelperService";

type CreateBookingAuditInput = {
    bookingId: string;
    actorId: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    data?: unknown;
    timestamp: Date; // Required: actual time of the booking change (business event)
};

const CURRENT_AUDIT_DATA_VERSION = 2;
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * BookingAuditService - Central service for all booking audit operations
 * 
 * Handles both write (audit creation) and read (display) operations
 * Version is automatically injected into all audit data
 */
export class BookingAuditService {
    constructor(
        private readonly bookingAuditRepository: IBookingAuditRepository = new PrismaBookingAuditRepository(),
        private readonly actorRepository: IActorRepository = new PrismaActorRepository()
    ) { }

    static create(): BookingAuditService {
        return new BookingAuditService();
    }

    private async getOrCreateUserActor(userId: number): Promise<string> {
        const actor = await this.actorRepository.upsertUserActor(userId);
        return actor.id;
    }

    /**
     * Creates a booking audit record with automatic version injection
     */
    private async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
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
            data: input.data
                ? ({
                    ...input.data,
                    version: CURRENT_AUDIT_DATA_VERSION, // Auto-inject version
                } as Prisma.InputJsonValue)
                : undefined,
        };

        return this.bookingAuditRepository.create(auditData);
    }

    // ============== WRITE OPERATIONS (Audit Creation) ==============

    async onBookingCreated(
        bookingId: string,
        userId: number | undefined,
        data: CreatedAuditData
    ): Promise<BookingAudit> {
        CreatedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_CREATED",
            action: "CREATED",
            data,
            timestamp: new Date(),
        });
    }

    async onBookingAccepted(
        bookingId: string,
        userId: number | undefined,
        data?: StatusChangeAuditData
    ): Promise<BookingAudit> {
        if (data) StatusChangeAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "ACCEPTED",
            data,
            timestamp: new Date(),
        });
    }

    async onBookingRejected(
        bookingId: string,
        userId: number | undefined,
        data: RejectedAuditData
    ): Promise<BookingAudit> {
        RejectedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "REJECTED",
            data,
            timestamp: new Date(),
        });
    }

    async onBookingPending(
        bookingId: string,
        userId: number | undefined,
        data?: StatusChangeAuditData
    ): Promise<BookingAudit> {
        if (data) StatusChangeAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "PENDING",
            data,
            timestamp: new Date(),
        });
    }

    async onBookingAwaitingHost(
        bookingId: string,
        userId: number | undefined,
        data?: StatusChangeAuditData
    ): Promise<BookingAudit> {
        if (data) StatusChangeAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "AWAITING_HOST",
            data,
            timestamp: new Date(),
        });
    }


    async onBookingCancelled(
        bookingId: string,
        userId: number | undefined,
        data: CancelledAuditData
    ): Promise<BookingAudit> {
        CancelledAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "CANCELLED",
            data,
            timestamp: new Date(),
        });
    }

    async onBookingRescheduled(
        bookingId: string,
        userId: number | undefined,
        data: RescheduledAuditData
    ): Promise<BookingAudit> {
        RescheduledAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "RESCHEDULED",
            data,
            timestamp: new Date(),
        });
    }

    async onRescheduleRequested(
        bookingId: string,
        userId: number | undefined,
        data: RescheduleRequestedAuditData
    ): Promise<BookingAudit> {
        RescheduleRequestedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "RESCHEDULE_REQUESTED",
            data,
            timestamp: new Date(),
        });
    }

    async onAttendeeAdded(
        bookingId: string,
        userId: number | undefined,
        data: AttendeeAddedAuditData
    ): Promise<BookingAudit> {
        AttendeeAddedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "ATTENDEE_ADDED",
            data,
            timestamp: new Date(),
        });
    }

    async onAttendeeRemoved(
        bookingId: string,
        userId: number | undefined,
        data: AttendeeRemovedAuditData
    ): Promise<BookingAudit> {
        AttendeeRemovedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "ATTENDEE_REMOVED",
            data,
            timestamp: new Date(),
        });
    }

    async onCancellationReasonUpdated(
        bookingId: string,
        userId: number | undefined,
        data: CancellationReasonUpdatedAuditData
    ): Promise<BookingAudit> {
        CancellationReasonUpdatedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "CANCELLATION_REASON_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onRejectionReasonUpdated(
        bookingId: string,
        userId: number | undefined,
        data: RejectionReasonUpdatedAuditData
    ): Promise<BookingAudit> {
        RejectionReasonUpdatedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "REJECTION_REASON_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onAssignmentReasonUpdated(
        bookingId: string,
        userId: number | undefined,
        data: AssignmentAuditData
    ): Promise<BookingAudit> {
        AssignmentAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "ASSIGNMENT_REASON_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onReassignmentReasonUpdated(
        bookingId: string,
        userId: number | undefined,
        data: ReassignmentAuditData
    ): Promise<BookingAudit> {
        ReassignmentAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "REASSIGNMENT_REASON_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onLocationChanged(
        bookingId: string,
        userId: number | undefined,
        data: LocationChangedAuditData
    ): Promise<BookingAudit> {
        LocationChangedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "LOCATION_CHANGED",
            data,
            timestamp: new Date(),
        });
    }

    async onMeetingUrlUpdated(
        bookingId: string,
        userId: number | undefined,
        data: MeetingUrlUpdatedAuditData
    ): Promise<BookingAudit> {
        MeetingUrlUpdatedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "MEETING_URL_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onHostNoShowUpdated(
        bookingId: string,
        userId: number | undefined,
        data: HostNoShowUpdatedAuditData
    ): Promise<BookingAudit> {
        HostNoShowUpdatedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "HOST_NO_SHOW_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onAttendeeNoShowUpdated(
        bookingId: string,
        userId: number | undefined,
        data: AttendeeNoShowUpdatedAuditData
    ): Promise<BookingAudit> {
        AttendeeNoShowUpdatedAuditActionHelperService.validate(data);
        const actorId = userId ? await this.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
        return this.createAuditRecord({
            bookingId,
            actorId,
            type: "RECORD_UPDATED",
            action: "ATTENDEE_NO_SHOW_UPDATED",
            data,
            timestamp: new Date(),
        });
    }

    async onSystemAction(
        bookingId: string,
        type: BookingAuditType,
        action: BookingAuditAction,
        data?: unknown
    ): Promise<BookingAudit> {
        return this.createAuditRecord({
            bookingId,
            actorId: SYSTEM_ACTOR_ID,
            type,
            action,
            data,
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
                const data = CreatedAuditActionHelperService.validate(audit.data);
                return CreatedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "ACCEPTED":
            case "PENDING":
            case "AWAITING_HOST": {
                const data = StatusChangeAuditActionHelperService.validate(audit.data);
                return StatusChangeAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "CANCELLED": {
                const data = CancelledAuditActionHelperService.validate(audit.data);
                return CancelledAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "REJECTED": {
                const data = RejectedAuditActionHelperService.validate(audit.data);
                return RejectedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "RESCHEDULED": {
                const data = RescheduledAuditActionHelperService.validate(audit.data);
                return RescheduledAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "RESCHEDULE_REQUESTED": {
                const data = RescheduleRequestedAuditActionHelperService.validate(audit.data);
                return RescheduleRequestedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "ATTENDEE_ADDED": {
                const data = AttendeeAddedAuditActionHelperService.validate(audit.data);
                return AttendeeAddedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "ATTENDEE_REMOVED": {
                const data = AttendeeRemovedAuditActionHelperService.validate(audit.data);
                return AttendeeRemovedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "REASSIGNMENT_REASON_UPDATED": {
                const data = ReassignmentAuditActionHelperService.validate(audit.data);
                return ReassignmentAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "ASSIGNMENT_REASON_UPDATED": {
                const data = AssignmentAuditActionHelperService.validate(audit.data);
                return AssignmentAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "CANCELLATION_REASON_UPDATED": {
                const data = CancellationReasonUpdatedAuditActionHelperService.validate(audit.data);
                return CancellationReasonUpdatedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "REJECTION_REASON_UPDATED": {
                const data = RejectionReasonUpdatedAuditActionHelperService.validate(audit.data);
                return RejectionReasonUpdatedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "LOCATION_CHANGED": {
                const data = LocationChangedAuditActionHelperService.validate(audit.data);
                return LocationChangedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "MEETING_URL_UPDATED": {
                const data = MeetingUrlUpdatedAuditActionHelperService.validate(audit.data);
                return MeetingUrlUpdatedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "HOST_NO_SHOW_UPDATED": {
                const data = HostNoShowUpdatedAuditActionHelperService.validate(audit.data);
                return HostNoShowUpdatedAuditActionHelperService.getDisplaySummary(data, t);
            }
            case "ATTENDEE_NO_SHOW_UPDATED": {
                const data = AttendeeNoShowUpdatedAuditActionHelperService.validate(audit.data);
                return AttendeeNoShowUpdatedAuditActionHelperService.getDisplaySummary(data, t);
            }
            default: {
                if (audit.type === "RECORD_CREATED") {
                    const data = CreatedAuditActionHelperService.validate(audit.data);
                    return CreatedAuditActionHelperService.getDisplaySummary(data, t);
                }
                return t('audit.action_performed');
            }
        }
    }

    /**
     * Get detailed key-value pairs for audit entry display
     */
    getDisplayDetails(audit: BookingAudit, t: TFunction): Record<string, string> {
        switch (audit.action) {
            case "CREATED": {
                const data = CreatedAuditActionHelperService.validate(audit.data);
                return CreatedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "ACCEPTED":
            case "PENDING":
            case "AWAITING_HOST": {
                const data = StatusChangeAuditActionHelperService.validate(audit.data);
                return StatusChangeAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "CANCELLED": {
                const data = CancelledAuditActionHelperService.validate(audit.data);
                return CancelledAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "REJECTED": {
                const data = RejectedAuditActionHelperService.validate(audit.data);
                return RejectedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "RESCHEDULED": {
                const data = RescheduledAuditActionHelperService.validate(audit.data);
                return RescheduledAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "RESCHEDULE_REQUESTED": {
                const data = RescheduleRequestedAuditActionHelperService.validate(audit.data);
                return RescheduleRequestedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "ATTENDEE_ADDED": {
                const data = AttendeeAddedAuditActionHelperService.validate(audit.data);
                return AttendeeAddedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "ATTENDEE_REMOVED": {
                const data = AttendeeRemovedAuditActionHelperService.validate(audit.data);
                return AttendeeRemovedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "REASSIGNMENT_REASON_UPDATED": {
                const data = ReassignmentAuditActionHelperService.validate(audit.data);
                return ReassignmentAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "ASSIGNMENT_REASON_UPDATED": {
                const data = AssignmentAuditActionHelperService.validate(audit.data);
                return AssignmentAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "CANCELLATION_REASON_UPDATED": {
                const data = CancellationReasonUpdatedAuditActionHelperService.validate(audit.data);
                return CancellationReasonUpdatedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "REJECTION_REASON_UPDATED": {
                const data = RejectionReasonUpdatedAuditActionHelperService.validate(audit.data);
                return RejectionReasonUpdatedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "LOCATION_CHANGED": {
                const data = LocationChangedAuditActionHelperService.validate(audit.data);
                return LocationChangedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "MEETING_URL_UPDATED": {
                const data = MeetingUrlUpdatedAuditActionHelperService.validate(audit.data);
                return MeetingUrlUpdatedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "HOST_NO_SHOW_UPDATED": {
                const data = HostNoShowUpdatedAuditActionHelperService.validate(audit.data);
                return HostNoShowUpdatedAuditActionHelperService.getDisplayDetails(data, t);
            }
            case "ATTENDEE_NO_SHOW_UPDATED": {
                const data = AttendeeNoShowUpdatedAuditActionHelperService.validate(audit.data);
                return AttendeeNoShowUpdatedAuditActionHelperService.getDisplayDetails(data, t);
            }
            default: {
                if (audit.type === "RECORD_CREATED") {
                    const data = CreatedAuditActionHelperService.validate(audit.data);
                    return CreatedAuditActionHelperService.getDisplayDetails(data, t);
                }
                return {};
            }
        }
    }
}

