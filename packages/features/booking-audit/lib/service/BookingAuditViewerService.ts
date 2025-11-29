import type { TFunction } from "next-i18next";

import { getTranslation } from "@calcom/lib/server/i18n";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import type { IAuditActionService } from "../actions/IAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import { AcceptedAuditActionService } from "../actions/AcceptedAuditActionService";
import type { IBookingAuditRepository, BookingAuditWithActor, BookingAuditAction, BookingAuditType } from "../repository/IBookingAuditRepository";

interface BookingAuditViewerServiceDeps {
    bookingAuditRepository: IBookingAuditRepository;
    userRepository: UserRepository;
}

type EnrichedAuditLog = {
    id: string;
    bookingUid: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    timestamp: string;
    createdAt: string;
    data: unknown;
    displaySummary: string;
    displayDetails: Record<string, string>;
    actor: {
        id: string;
        type: string;
        userUuid: string | null;
        attendeeId: number | null;
        email: string | null;
        phone: string | null;
        name: string | null;
        createdAt: Date;
        displayName: string;
        displayEmail: string | null;
    };
};

/**
 * BookingAuditViewerService - Service for viewing and formatting booking audit logs
 */
export class BookingAuditViewerService {
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
    private readonly userRepository: UserRepository;

    constructor(private readonly deps: BookingAuditViewerServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.userRepository = deps.userRepository;

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
     * Get audit logs for a booking with full enrichment and formatting
     * Handles permission checks, fetches logs, enriches actors, and formats display
     */
    async getAuditLogsForBooking(
        bookingUid: string,
        userId: number,
        userEmail: string,
        locale: string
    ): Promise<{ bookingUid: string; auditLogs: EnrichedAuditLog[] }> {
        // Check permissions
        await this.checkPermissions();

        // Fetch audit logs
        const auditLogs = await this.bookingAuditRepository.findAllForBooking(bookingUid);

        // Get translation function
        const t = await getTranslation(locale, "common");

        // Enrich and format audit logs
        const enrichedAuditLogs = await Promise.all(
            auditLogs.map(async (log) => {
                const enrichedActor = await this.enrichActorInformation(log.actor);
                const formattedLog = this.formatAuditLog(log, t);

                return {
                    id: log.id,
                    bookingUid: log.bookingUid,
                    type: log.type,
                    action: log.action,
                    timestamp: log.timestamp.toISOString(),
                    createdAt: log.createdAt.toISOString(),
                    data: log.data,
                    displaySummary: formattedLog.displaySummary,
                    displayDetails: formattedLog.displayDetails,
                    actor: {
                        ...log.actor,
                        displayName: enrichedActor.displayName,
                        displayEmail: enrichedActor.displayEmail,
                    },
                };
            })
        );

        return {
            bookingUid,
            auditLogs: enrichedAuditLogs,
        };
    }

    /**
     * Check if user has permission to view audit logs for a booking
     */
    private async checkPermissions(): Promise<void> {
        // TODO: Implement permission check
    }

    /**
     * Enrich actor information with user details if userUuid exists
     */
    private async enrichActorInformation(actor: BookingAuditWithActor["actor"]): Promise<{
        displayName: string;
        displayEmail: string | null;
    }> {
        let actorDisplayName = actor.name || "System";
        let actorEmail = actor.email;

        if (actor.userUuid) {
            const actorUser = await this.userRepository.findByUuid({ uuid: actor.userUuid });

            if (actorUser) {
                actorDisplayName = actorUser.name || actorUser.email;
                actorEmail = actorUser.email;
            }
        }

        return {
            displayName: actorDisplayName,
            displayEmail: actorEmail,
        };
    }

    /**
     * Format audit log with display summary and details using action services
     */
    private formatAuditLog(
        audit: BookingAuditWithActor,
        t: TFunction
    ): { displaySummary: string; displayDetails: Record<string, string> } {
        // Map action to corresponding service
        const actionServiceMap: Record<BookingAuditAction, IAuditActionService<z.ZodTypeAny> | null> = {
            CREATED: this.createdActionService,
            ACCEPTED: this.acceptedActionService,
            CANCELLED: this.cancelledActionService,
            REJECTED: this.rejectedActionService,
            RESCHEDULED: this.rescheduledActionService,
            RESCHEDULE_REQUESTED: this.rescheduleRequestedActionService,
            ATTENDEE_ADDED: this.attendeeAddedActionService,
            ATTENDEE_REMOVED: this.attendeeRemovedActionService,
            REASSIGNMENT: this.reassignmentActionService,
            LOCATION_CHANGED: this.locationChangedActionService,
            HOST_NO_SHOW_UPDATED: this.hostNoShowUpdatedActionService,
            ATTENDEE_NO_SHOW_UPDATED: this.attendeeNoShowUpdatedActionService,
            PENDING: null,
            AWAITING_HOST: null,
        };

        const actionService = actionServiceMap[audit.action];

        if (!actionService) {
            throw new Error(
                `No action service found for audit action: ${audit.action}. This indicates a missing implementation or invalid audit data.`
            );
        }

        const data = actionService.parseStored(audit.data);
        return {
            displaySummary: actionService.getDisplaySummary(data, t),
            displayDetails: actionService.getDisplayDetails(data, t),
        };
    }
}

