import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import { BookingAuditErrorCode } from "../BookingAuditResult";

type AccessResult = { success: true } | { success: false; code: BookingAuditErrorCode };

interface BookingAuditAccessServiceDeps {
  bookingRepository: BookingRepository;
  membershipRepository: PrismaMembershipRepository;
}

/**
 * BookingAuditAccessService - Service for checking access permissions to booking audit logs
 * Audit logs are admin-only for compliance and security purposes.
 * Regular users (including booking organizers and hosts) cannot view audit logs.
 */
export class BookingAuditAccessService {
  private readonly bookingRepository: BookingRepository;
  private readonly membershipRepository: PrismaMembershipRepository;
  private readonly permissionCheckService: PermissionCheckService;

  constructor(deps: BookingAuditAccessServiceDeps) {
    this.bookingRepository = deps.bookingRepository;
    this.membershipRepository = deps.membershipRepository;
    this.permissionCheckService = new PermissionCheckService();
  }

  /**
   * Check if user has permission to view audit logs for a booking.
   *
   * First checks whether the booking belongs to the user's organization,
   * then verifies the user has PBAC permission to view audit logs.
   */
  async checkPermissions({
    bookingUid,
    userId,
    organizationId,
  }: {
    bookingUid: string;
    userId: number;
    organizationId: number | null;
  }): Promise<AccessResult> {
    // Pre-condition: organization context must be provided
    if (!organizationId) {
      return { success: false, code: BookingAuditErrorCode.NO_ORGANIZATION_CONTEXT };
    }

    const booking = await this.bookingRepository.findByUidIncludeEventType({ bookingUid });
    if (!booking) {
      return { success: false, code: BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_NO_ACCESS };
    }

    const bookingEventType = booking.eventType;
    const bookingEventTypeTeamId = bookingEventType?.teamId ?? bookingEventType?.parent?.teamId;

    // Check if this booking belongs to the user's organization
    if (bookingEventTypeTeamId) {
      // Team booking: check if the team belongs to the user's organization
      const teamParentId = bookingEventType?.teamId
        ? bookingEventType.team?.parentId
        : bookingEventType?.parent?.team?.parentId;
      const isTeamInOrg = bookingEventTypeTeamId === organizationId || teamParentId === organizationId;
      if (!isTeamInOrg) {
        return { success: false, code: BookingAuditErrorCode.TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION };
      }
    } else {
      // Personal booking: check if the booking owner is in the user's organization
      const bookingOwnerId = booking.userId;
      if (!bookingOwnerId) {
        return { success: false, code: BookingAuditErrorCode.BOOKING_HAS_NO_OWNER };
      }
      const isBookingOwnerMemberOfOrganization = await this.membershipRepository.hasMembership({
        userId: bookingOwnerId,
        teamId: organizationId,
      });
      if (!isBookingOwnerMemberOfOrganization) {
        return { success: false, code: BookingAuditErrorCode.BOOKING_OWNER_NOT_IN_ORGANIZATION };
      }
    }

    // Check if the user has PBAC permission to view audit logs
    if (bookingEventTypeTeamId) {
      const hasTeamAccess = await this.permissionCheckService.checkPermission({
        userId,
        teamId: bookingEventTypeTeamId,
        permission: "booking.readTeamAuditLogs",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
      if (hasTeamAccess) {
        return { success: true };
      }
    }

    const hasOrgAccess = await this.permissionCheckService.checkPermission({
      userId,
      teamId: organizationId,
      permission: "booking.readOrgAuditLogs",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (hasOrgAccess) {
      return { success: true };
    }
    return { success: false, code: BookingAuditErrorCode.ORG_MEMBER_PERMISSION_DENIED };
  }
}
