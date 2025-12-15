import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import { BookingAuditActionServiceRegistry } from "./BookingAuditActionServiceRegistry";
import type { IBookingAuditRepository, BookingAuditWithActor, BookingAuditAction, BookingAuditType } from "../repository/IBookingAuditRepository";
import type { AuditActorType } from "../repository/IAuditActorRepository";
import type { TranslationWithParams } from "../actions/IAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import { IS_PRODUCTION } from "@calcom/lib/constants";

interface BookingAuditViewerServiceDeps {
    bookingAuditRepository: IBookingAuditRepository;
    userRepository: UserRepository;
    bookingRepository: BookingRepository;
    log: ISimpleLogger;
}

type EnrichedAuditLog = {
    id: string;
    bookingUid: string;
    type: BookingAuditType;
    action: BookingAuditAction;
    timestamp: string;
    createdAt: string;
    data: Record<string, unknown> | null;
    actionDisplayTitle: TranslationWithParams;
    displayFields?: Array<{ labelKey: string; valueKey: string }>;
    actor: {
        id: string;
        type: AuditActorType;
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
    private readonly rescheduledAuditActionService: RescheduledAuditActionService;
    private readonly log: BookingAuditViewerServiceDeps["log"];

    constructor(private readonly deps: BookingAuditViewerServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.userRepository = deps.userRepository;
        this.bookingRepository = deps.bookingRepository;
        this.log = deps.log;
        this.rescheduledAuditActionService = new RescheduledAuditActionService();

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
    async getAuditLogsForBooking(
        bookingUid: string,
        _userId: number,
        _userEmail: string,
        userTimeZone?: string
    ): Promise<{ bookingUid: string; auditLogs: EnrichedAuditLog[] }> {
        await this.checkPermissions();

        const auditLogs = await this.bookingAuditRepository.findAllForBooking(bookingUid);

        // Default to UTC if no timezone provided (backwards compatibility)
        const timezone = userTimeZone ?? "UTC";

        const enrichedAuditLogs = await Promise.all(
            auditLogs.map((log) => this.enrichAuditLog(log, timezone))
        );

        const fromRescheduleUid = await this.bookingRepository.getFromRescheduleUid(bookingUid);

        // Check if this booking was created from a reschedule
        if (fromRescheduleUid) {
            const rescheduledFromLog = await this.buildRescheduledFromLog({
                fromRescheduleUid,
                currentBookingUid: bookingUid,
                userTimeZone: timezone,
            });
            if (rescheduledFromLog) {
                // Add the rescheduled log from the previous booking as the first entry
                // (appears last chronologically since logs are ordered by timestamp DESC)
                enrichedAuditLogs.unshift(rescheduledFromLog);
            }
        }

        return {
            bookingUid,
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

        // Get display data - use custom getDisplayJson if available, otherwise use raw fields
        const displayData = (actionService.getDisplayJson
            ? actionService.getDisplayJson({ storedData: parsedData, userTimeZone })
            : parsedData.fields) as Record<string, unknown> | null;

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
            data: displayData,
            actionDisplayTitle,
            displayFields,
            actor: {
                id: log.actor.id,
                type: log.actor.type,
                userUuid: log.actor.userUuid,
                attendeeId: log.actor.attendeeId,
                name: log.actor.name,
                createdAt: log.actor.createdAt,
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
            this.log.error(`No rescheduled log found for booking ${fromRescheduleUid} -> ${currentBookingUid}`);
            // Instead of crashing, we ignore because it is important to be able to access other logs as well.
            return null;
        }

        const enrichedLog = await this.enrichAuditLog(rescheduledLog, userTimeZone);
        const parsedData = this.rescheduledAuditActionService.parseStored(rescheduledLog.data);

        // Transform the display data to show "rescheduled from" instead of "rescheduled to"
        // by replacing rescheduledToUid with rescheduledFromUid
        const transformedData = {
            ...enrichedLog.data,
            rescheduledFromUid: fromRescheduleUid,
        };

        return {
            ...enrichedLog,
            // Override bookingUid to associate with the current booking being viewed
            bookingUid: currentBookingUid,
            data: transformedData,
            // Use a different translation key to show "Rescheduled from" instead of "Rescheduled"
            actionDisplayTitle: this.rescheduledAuditActionService.getDisplayTitleForRescheduledFromLog({
                fromRescheduleUid,
                userTimeZone,
                parsedData,
            }),
        };
    }

    /**
     * Check if user has permission to view audit logs for a booking
     */
    private async checkPermissions(): Promise<void> {
        // TODO: Implement permission check
        if (IS_PRODUCTION) {
            throw new Error("Permission check is not implemented for production environments");
        }
    }

    /**
     * Enrich actor information with user details if userUuid exists
     */
    private async enrichActorInformation(actor: BookingAuditWithActor["actor"]): Promise<{
        displayName: string;
        displayEmail: string | null;
        displayAvatar: string | null;
    }> {
        // SYSTEM actor
        if (actor.type === "SYSTEM") {
            return {
                displayName: "Cal.com",
                displayEmail: null,
                displayAvatar: null,
            };
        }

        // GUEST actor - use name or default
        if (actor.type === "GUEST") {
            return {
                displayName: actor.name || "Guest",
                displayEmail: null,
                displayAvatar: null,
            };
        }

        // ATTENDEE actor - use name or default
        if (actor.type === "ATTENDEE") {
            return {
                displayName: actor.name || "Attendee",
                displayEmail: null,
                displayAvatar: null,
            };
        }

        // USER actor - lookup from User table and include avatar
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

        // Satisfying Typescript
        throw new Error(`Unknown actor type: ${actor.type}`);
    }
}
