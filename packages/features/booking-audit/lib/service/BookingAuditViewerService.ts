import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { BookingAuditActionServiceRegistry, type AuditDisplayData } from "./BookingAuditActionServiceRegistry";
import type { IBookingAuditRepository, BookingAuditWithActor, BookingAuditAction, BookingAuditType } from "../repository/IBookingAuditRepository";
import { IS_PRODUCTION } from "@calcom/lib/constants";

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
    data: AuditDisplayData;
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

    constructor(private readonly deps: BookingAuditViewerServiceDeps) {
        this.bookingAuditRepository = deps.bookingAuditRepository;
        this.userRepository = deps.userRepository;

        // Centralized registry for all action services
        this.actionServiceRegistry = new BookingAuditActionServiceRegistry();
    }

    /**
     * Get audit logs for a booking with full enrichment and formatting
     * Handles permission checks, fetches logs, enriches actors, and formats display
     */
    async getAuditLogsForBooking(
        bookingUid: string,
        _userId: number,
        _userEmail: string
    ): Promise<{ bookingUid: string; auditLogs: EnrichedAuditLog[] }> {
        // Check permissions
        await this.checkPermissions();

        // Fetch audit logs
        const auditLogs = await this.bookingAuditRepository.findAllForBooking(bookingUid);

        // Enrich and format audit logs
        const enrichedAuditLogs = await Promise.all(
            auditLogs.map(async (log) => {
                const enrichedActor = await this.enrichActorInformation(log.actor);

                const actionService = this.actionServiceRegistry.getActionService(log.action);
                const parsedData = actionService.parseStored(log.data);

                return {
                    id: log.id,
                    bookingUid: log.bookingUid,
                    type: log.type,
                    action: log.action,
                    timestamp: log.timestamp.toISOString(),
                    createdAt: log.createdAt.toISOString(),
                    data: actionService.getDisplayJson(parsedData) as AuditDisplayData,
                    actor: {
                        ...log.actor,
                        displayName: enrichedActor.displayName,
                        displayEmail: enrichedActor.displayEmail,
                        displayAvatar: enrichedActor.displayAvatar,
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
