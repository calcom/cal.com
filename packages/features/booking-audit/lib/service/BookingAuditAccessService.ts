import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { MembershipRole } from "@calcom/prisma/enums";

import { BookingAuditErrorCode } from "../BookingAuditErrorCode";

export { BookingAuditErrorCode };

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
   * Throws ErrorWithCode if access is denied
   */
  async assertPermissions({
    bookingUid,
    userId,
    organizationId,
  }: {
    bookingUid: string;
    userId: number;
    organizationId: number | null;
  }): Promise<void> {
    if (!organizationId) {
      throw new ErrorWithCode(ErrorCode.Forbidden, BookingAuditErrorCode.ORGANIZATION_ID_REQUIRED);
    }

    const booking = await this.bookingRepository.findByUidIncludeEventType({ bookingUid });
    if (!booking) {
      throw new ErrorWithCode(ErrorCode.Forbidden, BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED);
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
      throw new ErrorWithCode(ErrorCode.Forbidden, BookingAuditErrorCode.BOOKING_HAS_NO_OWNER);
    }

    const isBookingOwnerMemberOfOrganization = await this.membershipRepository.hasMembership({
      userId: bookingOwnerId,
      teamId: organizationId,
    });

    if (!isBookingOwnerMemberOfOrganization) {
      throw new ErrorWithCode(ErrorCode.Forbidden, BookingAuditErrorCode.OWNER_NOT_IN_ORGANIZATION);
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
    throw new ErrorWithCode(ErrorCode.Forbidden, BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED);
  }
}
