import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";

import { BookingAuditActionServiceRegistry } from "./BookingAuditActionServiceRegistry";
import { BookingAuditAccessService } from "./BookingAuditAccessService";
import type { IBookingAuditRepository, BookingAuditWithActor, BookingAuditAction, BookingAuditType } from "../repository/IBookingAuditRepository";
import type { TranslationWithParams } from "../actions/IAuditActionService";
import type { ActionSource } from "../common/actionSource";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";

interface BookingAuditViewerServiceDeps {
    bookingAuditRepository: IBookingAuditRepository;
    userRepository: UserRepository;
    bookingRepository: BookingRepository;
    membershipRepository: MembershipRepository;
    attendeeRepository: AttendeeRepository;
}

type EnrichedAuditLog = {
    id: string;
    bookingUid: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    timestamp: string;
    createdAt: string;
    source: ActionSource;
    displayJson?: Record<string, unknown> | null;
    actionDisplayTitle: TranslationWithParams;
    displayFields?: Array<{ labelKey: string; valueKey: string }>;
    actor: {
        id: string;
        type: string;
        userUuid: string | null;
        attendeeId: number | null;
        name: string | null;
        createdAt: Date;
        displayName: string;
        displayEmail: string | null;
        displayAvatar: string | null;
    };
};

/**
 * BookingAuditViewerService - Service for viewing and formatting booking audit logs
 */
export class BookingAuditViewerService {
    private readonly actionServiceRegistry: BookingAuditActionServiceRegistry;
    private readonly bookingAuditRepository: IBookingAuditRepository;
    private readonly userRepository: UserRepository;
    private readonly bookingRepository: BookingRepository;
    private readonly membershipRepository: MembershipRepository;
    private readonly attendeeRepository: AttendeeRepository;
    private readonly rescheduledAuditActionService: RescheduledAuditActionService;
    private readonly accessService: BookingAuditAccessService;

    constructor(private readonly deps: BookingAuditViewerServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.userRepository = deps.userRepository;
        this.bookingRepository = deps.bookingRepository;
        this.membershipRepository = deps.membershipRepository;
        this.attendeeRepository = deps.attendeeRepository;
        this.rescheduledAuditActionService = new RescheduledAuditActionService();
        this.accessService = new BookingAuditAccessService({
            bookingRepository: this.bookingRepository,
            membershipRepository: this.membershipRepository,
        });
        this.actionServiceRegistry = new BookingAuditActionServiceRegistry({ userRepository: this.userRepository });
    }

    /**
     * Get audit logs for a booking with full enrichment and formatting
     * Handles permission checks, fetches logs, enriches actors, and formats display
     * 
     * For bookings created from a reschedule (has fromReschedule field), this also
     * fetches the last RESCHEDULED log from the previous booking and includes it
     * as the first log entry with "rescheduled from" context.
     */
    async getAuditLogsForBooking(params: {
        bookingUid: string;
        userId: number;
        userEmail: string;
        userTimeZone: string;
        organizationId: number | null;
    }): Promise<{ bookingUid: string; auditLogs: EnrichedAuditLog[] }> {
        await this.accessService.assertPermissions({
            bookingUid: params.bookingUid,
            userId: params.userId,
            organizationId: params.organizationId
        });

        const auditLogs = await this.bookingAuditRepository.findAllForBooking(params.bookingUid);

        const enrichedAuditLogs = await Promise.all(
            auditLogs.map((log) => this.enrichAuditLog(log, params.userTimeZone))
        );

        const fromRescheduleUid = await this.bookingRepository.getFromRescheduleUid(params.bookingUid);

        // Check if this booking was created from a reschedule
        if (fromRescheduleUid) {
            const rescheduledFromLog = await this.buildRescheduledFromLog({
                fromRescheduleUid,
                currentBookingUid: params.bookingUid,
                userTimeZone: params.userTimeZone,
            });
            if (rescheduledFromLog) {
                // Add the rescheduled log from the previous booking as the first entry
                // (appears last chronologically since logs are ordered by timestamp DESC)
                enrichedAuditLogs.unshift(rescheduledFromLog);
            }
        }

        return {
            bookingUid: params.bookingUid,
            auditLogs: enrichedAuditLogs,
        };
    }

    /**
     * Enriches a single audit log with actor information and formatted display data
     */
    private async enrichAuditLog(log: BookingAuditWithActor, userTimeZone: string): Promise<EnrichedAuditLog> {
        const enrichedActor = await this.enrichActorInformation(log.actor);

        const actionService = this.actionServiceRegistry.getActionService(log.action);
        const parsedData = actionService.parseStored(log.data);

        const actionDisplayTitle = await actionService.getDisplayTitle({ storedData: parsedData, userTimeZone });

        // Get display JSON - only set if getDisplayJson is defined
        const displayJson = actionService.getDisplayJson
            ? actionService.getDisplayJson({ storedData: parsedData, userTimeZone })
            : undefined;

        // Get display fields - use custom getDisplayFields if available
        const displayFields = actionService.getDisplayFields
            ? actionService.getDisplayFields(parsedData)
            : undefined;

        return {
            id: log.id,
            bookingUid: log.bookingUid,
            type: log.type,
            action: log.action,
            timestamp: log.timestamp.toISOString(),
            createdAt: log.createdAt.toISOString(),
            source: log.source,
            displayJson,
            actionDisplayTitle,
            displayFields,
            actor: {
                ...log.actor,
                displayName: enrichedActor.displayName,
                displayEmail: enrichedActor.displayEmail,
                displayAvatar: enrichedActor.displayAvatar,
            },
        };
    }
    /**
     * Builds a "rescheduled from" log entry for bookings created from a reschedule.
     * Fetches the RESCHEDULED log from the previous booking and transforms it
     * to show "rescheduled from" context for the current booking.
     */
    private async buildRescheduledFromLog({
        fromRescheduleUid,
        currentBookingUid,
        userTimeZone,
    }: {
        fromRescheduleUid: string;
        currentBookingUid: string;
        userTimeZone: string;
    }): Promise<EnrichedAuditLog | null> {
        const rescheduledLogs = await this.bookingAuditRepository.findRescheduledLogsOfBooking(
            fromRescheduleUid
        );

        // Find the specific log that created this booking by matching rescheduledToUid
        const rescheduledLog = this.rescheduledAuditActionService.getMatchingLog({
            rescheduledLogs,
            rescheduledToBookingUid: currentBookingUid,
        });

        if (!rescheduledLog) {
            // TODO: Use logger instead of console.error
            console.error(`No rescheduled log found for booking ${fromRescheduleUid} -> ${currentBookingUid}`);
            // Instead of crashing, we ignore because it is important to be able to access other logs as well.
            return null;
        }

        const enrichedLog = await this.enrichAuditLog(rescheduledLog, userTimeZone);
        const parsedData = this.rescheduledAuditActionService.parseStored(rescheduledLog.data);

        // Transform the display JSON to show "rescheduled from" instead of "rescheduled to"
        // by replacing rescheduledToUid with rescheduledFromUid
        const transformedDisplayJson = enrichedLog.displayJson
            ? {
                ...enrichedLog.displayJson,
                rescheduledFromUid: fromRescheduleUid,
            }
            : undefined;

        return {
            ...enrichedLog,
            // Override bookingUid to associate with the current booking being viewed
            bookingUid: currentBookingUid,
            displayJson: transformedDisplayJson,
            // Use a different translation key to show "Rescheduled from" instead of "Rescheduled"
            actionDisplayTitle: this.rescheduledAuditActionService.getDisplayTitleForRescheduledFromLog({
                fromRescheduleUid,
                userTimeZone,
                parsedData,
            }),
        };
    }

    /**
     * Enrich actor information with user details if userUuid exists
     */
    private async enrichActorInformation(actor: BookingAuditWithActor["actor"]): Promise<{
        displayName: string;
        displayEmail: string | null;
        displayAvatar: string | null;
    }> {
        if (actor.type === "SYSTEM") {
            return {
                displayName: "Cal.com",
                displayEmail: null,
                displayAvatar: null,
            };
        }

        if (actor.type === "GUEST") {
            return {
                displayName: actor.name || "Guest",
                displayEmail: null,
                displayAvatar: null,
            };
        }

        if (actor.type === "USER") {
            if (!actor.userUuid) {
                throw new Error("User UUID is required for USER actor");
            }
            const actorUser = await this.userRepository.findByUuid({ uuid: actor.userUuid });
            if (actorUser) {
                return {
                    displayName: actorUser.name || actorUser.email,
                    displayEmail: actorUser.email,
                    displayAvatar: actorUser.avatarUrl || null,
                };
            }
            return {
                displayName: "Deleted User",
                displayEmail: null,
                displayAvatar: null,
            }
        }


        // ATTENDEE actor - use name or default
        if (actor.type === "ATTENDEE") {
            if (!actor.attendeeId) {
                throw new Error("Attendee ID is required for ATTENDEE actor");
            }
            const attendee = await this.attendeeRepository.findById(actor.attendeeId);
            if (attendee) {
                return {
                    displayName: attendee.name || attendee.email,
                    displayEmail: attendee.email,
                    displayAvatar: null,
                };
            }
            return {
                displayName: "Deleted Attendee",
                displayEmail: null,
                displayAvatar: null,
            }
        }

        throw new Error(`Unknown actor type: ${actor.type}`);
    }
}
