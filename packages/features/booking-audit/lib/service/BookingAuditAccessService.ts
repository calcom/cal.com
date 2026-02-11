import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

export enum BookingAuditErrorCode {
    ORGANIZATION_ID_REQUIRED = "ORGANIZATION_ID_REQUIRED",
    BOOKING_NOT_FOUND_OR_PERMISSION_DENIED = "BOOKING_NOT_FOUND_OR_PERMISSION_DENIED",
    BOOKING_HAS_NO_OWNER = "BOOKING_HAS_NO_OWNER",
    OWNER_NOT_IN_ORGANIZATION = "OWNER_NOT_IN_ORGANIZATION",
    PERMISSION_DENIED = "PERMISSION_DENIED",
}

export class BookingAuditPermissionError extends Error {
    constructor(public readonly code: BookingAuditErrorCode) {
        super(code);
        this.name = "BookingAuditPermissionError";
    }
}

interface BookingAuditAccessServiceDeps {
    bookingRepository: BookingRepository;
    membershipRepository: MembershipRepository;
}

/**
 * BookingAuditAccessService - Service for checking access permissions to booking audit logs
 * Audit logs are admin-only for compliance and security purposes.
 * Regular users (including booking organizers and hosts) cannot view audit logs.
 */
export class BookingAuditAccessService {
    private readonly bookingRepository: BookingRepository;
    private readonly membershipRepository: MembershipRepository;
    private readonly permissionCheckService: PermissionCheckService;

    constructor(deps: BookingAuditAccessServiceDeps) {
        this.bookingRepository = deps.bookingRepository;
        this.membershipRepository = deps.membershipRepository;
        this.permissionCheckService = new PermissionCheckService();
    }

    /**
     * Check if user has permission to view audit logs for a booking
     * Throws BookingAuditPermissionError if access is denied
     */
    async assertPermissions({ bookingUid, userId, organizationId }: { bookingUid: string, userId: number, organizationId: number | null }): Promise<void> {
        if (!organizationId) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED);
        }

        const booking = await this.bookingRepository.findByUidIncludeEventType({ bookingUid });
        if (!booking) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED);
        }

        const bookingEventType = booking.eventType;
        const bookingEventTypeTeamId = bookingEventType?.teamId ?? bookingEventType?.parent?.teamId;

        if (bookingEventTypeTeamId) {
            const hasAccess = await this.permissionCheckService.checkPermission({
                userId,
                teamId: bookingEventTypeTeamId,
                permission: "booking.readTeamAuditLogs",
                fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
            });
            if (hasAccess) {
                return;
            }
        }

        const bookingOwnerId = booking.userId;

        if (!bookingOwnerId) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.BOOKING_HAS_NO_OWNER);
        }

        const isBookingOwnerMemberOfOrganization = await this.membershipRepository.hasMembership({ userId: bookingOwnerId, teamId: organizationId });

        if (!isBookingOwnerMemberOfOrganization) {
            throw new BookingAuditPermissionError(BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION);
        }

        const hasAccess = await this.permissionCheckService.checkPermission({
            userId,
            teamId: organizationId,
            permission: "booking.readOrgAuditLogs",
            fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });

        if (hasAccess) {
            return;
        }
        throw new BookingAuditPermissionError(BookingAuditErrorCode.PERMISSION_DENIED);
    }
}
