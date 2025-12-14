/**
 * ORM-agnostic interface for BookingRepository
 * This interface defines the contract for booking data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

// Re-export all DTOs from the dto folder for convenience
export type {
  BookingBasicDto,
  BookingInstantLocationDto,
  BookingExistsDto,
  TeamSummaryDto,
  DestinationCalendarDto,
  CredentialDto,
  UserProfileDto,
  BookingUserDto,
  AttendeeDto,
  BookingReferenceDto,
  EventTypeWithTeamDto,
  BookingFullContextDto,
  BookingConfirmationUserDto,
  WorkflowStepDto,
  WorkflowDto,
  WorkflowOnEventTypeDto,
  ParentEventTypeDto,
  EventTypeOwnerDto,
  EventTypeForConfirmationDto,
  PaymentDto,
  BookingForConfirmationDto,
  BookingUpdateResultDto,
  BookingBatchUpdateResultDto,
  BookingReferenceCreateInput,
  UpdateLocationInput,
} from "../dto";

import type {
  BookingBasicDto,
  BookingInstantLocationDto,
  BookingExistsDto,
  BookingFullContextDto,
  BookingForConfirmationDto,
  BookingUpdateResultDto,
  BookingBatchUpdateResultDto,
  UpdateLocationInput,
} from "../dto";

// ============================================================================
// Repository Interface
// ============================================================================

export interface IBookingRepository {
  /**
   * Find a booking by UID with basic information
   */
  findByUidBasic(params: { bookingUid: string }): Promise<BookingBasicDto | null>;

  /**
   * Find an accepted booking by ID for instant booking location lookup
   */
  findAcceptedByIdForInstantBooking(params: { bookingId: number }): Promise<BookingInstantLocationDto | null>;

  /**
   * Count seat references by reference UID
   */
  countSeatReferencesByReferenceUid(params: { referenceUid: string }): Promise<number | null>;

  /**
   * Find a booking by ID for admin authorization with full context
   */
  findByIdForAdminIncludeFullContext(params: {
    bookingId: number;
    adminUserId: number;
  }): Promise<BookingFullContextDto | null>;

  /**
   * Find a booking by ID for organizer or collective member authorization with full context
   */
  findByIdForOrganizerOrCollectiveMemberIncludeFullContext(params: {
    bookingId: number;
    userId: number;
  }): Promise<BookingFullContextDto | null>;

  /**
   * Find a booking by ID for confirmation flow
   */
  findByIdForConfirmation(params: { bookingId: number }): Promise<BookingForConfirmationDto>;

  /**
   * Update booking status to accepted
   */
  updateStatusToAccepted(params: { bookingId: number }): Promise<BookingUpdateResultDto>;

  /**
   * Check if a recurring event booking exists
   */
  findRecurringEventBookingExists(params: {
    recurringEventId: string;
    bookingId: number;
  }): Promise<BookingExistsDto | null>;

  /**
   * Count bookings by recurring event ID
   */
  countByRecurringEventId(params: { recurringEventId: string }): Promise<number>;

  /**
   * Reject all pending bookings by recurring event ID
   */
  rejectAllPendingByRecurringEventId(params: {
    recurringEventId: string;
    rejectionReason?: string;
  }): Promise<BookingBatchUpdateResultDto>;

  /**
   * Reject a booking by ID
   */
  rejectById(params: { bookingId: number; rejectionReason?: string }): Promise<BookingUpdateResultDto>;

  /**
   * Update booking location by ID
   */
  updateLocationById(params: UpdateLocationInput): Promise<void>;
}
