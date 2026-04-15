import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

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

  constructor(deps: BookingAuditAccessServiceDeps) {
    this.bookingRepository = deps.bookingRepository;
    this.membershipRepository = deps.membershipRepository;
  }

  /**
   * Check if user has permission to view audit logs for a booking.
   * In cal.diy (no orgs/teams/PBAC), the booking owner always has access.
   */
  async assertPermissions({
    bookingUid,
    userId,
  }: {
    bookingUid: string;
    userId: number;
    organizationId: number | null;
  }): Promise<void> {
    const booking = await this.bookingRepository.findByUidIncludeEventType({ bookingUid });
    if (!booking) {
      throw new BookingAuditPermissionError(BookingAuditErrorCode.BOOKING_NOT_FOUND_OR_PERMISSION_DENIED);
    }

    const bookingOwnerId = booking.userId;

    if (!bookingOwnerId) {
      throw new BookingAuditPermissionError(BookingAuditErrorCode.BOOKING_HAS_NO_OWNER);
    }

    // In cal.diy, the booking owner can always view their own audit logs
    if (bookingOwnerId === userId) {
      return;
    }

    throw new BookingAuditPermissionError(BookingAuditErrorCode.PERMISSION_DENIED);
  }
}
