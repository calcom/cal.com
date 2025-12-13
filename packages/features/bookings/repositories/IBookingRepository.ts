/**
 * ORM-agnostic interface for BookingRepository
 * This interface defines the contract for booking data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

import type {
  BookingStatus,
  WorkflowTriggerEvents,
  TimeUnit,
  PaymentOption,
  WorkflowActions,
  WorkflowTemplates,
} from "@calcom/prisma/enums";
import type { JsonValue } from "@calcom/types/JsonObject";

// ============================================================================
// DTOs - Data Transfer Objects
// These types define the shape of data returned by repository methods
// They are ORM-agnostic and should not depend on Prisma types
// ============================================================================

/**
 * Basic booking information returned by findByUidBasic
 */
export interface BookingBasicDto {
  id: number;
  uid: string;
  startTime: Date;
  endTime: Date;
  description: string | null;
  status: BookingStatus;
  paid: boolean;
  eventTypeId: number | null;
}

/**
 * Booking information for instant booking location lookup
 */
export interface BookingInstantLocationDto {
  id: number;
  uid: string;
  location: string | null;
  metadata: Record<string, unknown> | null;
  startTime: Date;
  status: BookingStatus;
  endTime: Date;
  description: string | null;
  eventTypeId: number | null;
}

/**
 * Minimal booking reference for existence checks
 */
export interface BookingExistsDto {
  id: number;
}

/**
 * Team information nested in event type
 */
export interface TeamSummaryDto {
  id: number;
  name: string;
  parentId: number | null;
}

/**
 * Destination calendar information
 */
export interface DestinationCalendarDto {
  id: number;
  integration: string;
  externalId: string;
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
}

/**
 * Credential information for calendar services
 */
export interface CredentialDto {
  id: number;
  type: string;
  key: unknown;
  userId: number | null;
  teamId: number | null;
  appId: string | null;
  subscriptionId: string | null;
  paymentStatus: string | null;
  billingCycleStart: number | null;
  invalid: boolean | null;
}

/**
 * User profile organization reference
 */
export interface UserProfileDto {
  organizationId: number | null;
}

/**
 * User information for booking context
 */
export interface BookingUserDto {
  id: number;
  destinationCalendar: DestinationCalendarDto | null;
  credentials: CredentialDto[];
  profiles: UserProfileDto[];
}

/**
 * Attendee information
 */
export interface AttendeeDto {
  id: number;
  email: string;
  name: string;
  timeZone: string;
  locale: string | null;
  bookingId: number | null;
  phoneNumber: string | null;
  noShow: boolean | null;
}

/**
 * Booking reference (calendar/video integrations)
 * Compatible with Prisma BookingReference type
 */
export interface BookingReferenceDto {
  id: number;
  type: string;
  uid: string;
  meetingId: string | null;
  meetingPassword: string | null;
  meetingUrl: string | null;
  bookingId: number | null;
  externalCalendarId: string | null;
  deleted: boolean | null;
  credentialId: number | null;
  thirdPartyRecurringEventId: string | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
}

/**
 * Event type with team for booking context
 */
export interface EventTypeWithTeamDto {
  team: TeamSummaryDto | null;
  metadata: JsonValue;
  title: string;
  recurringEvent: JsonValue;
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  hideOrganizerEmail: boolean;
  customReplyToEmail: string | null;
}

/**
 * Full booking context for admin/organizer authorization
 */
export interface BookingFullContextDto {
  id: number;
  uid: string;
  userId: number | null;
  startTime: Date;
  endTime: Date;
  title: string;
  description: string | null;
  status: BookingStatus;
  attendees: AttendeeDto[];
  eventType: EventTypeWithTeamDto | null;
  destinationCalendar: DestinationCalendarDto | null;
  references: BookingReferenceDto[];
  user: BookingUserDto | null;
  userPrimaryEmail: string | null;
  iCalUID: string | null;
  iCalSequence: number;
  metadata: JsonValue;
  responses: JsonValue;
}

/**
 * User information for confirmation flow
 */
export interface BookingConfirmationUserDto {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  timeFormat: number | null;
  name: string | null;
  destinationCalendar: DestinationCalendarDto | null;
  locale: string | null;
}

/**
 * Workflow step information
 * Compatible with @calcom/features/ee/workflows/lib/types.WorkflowStep
 */
export interface WorkflowStepDto {
  id: number;
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo: string | null;
  reminderBody: string | null;
  emailSubject: string | null;
  template: WorkflowTemplates;
  numberRequired: boolean | null;
  sender: string | null;
  numberVerificationPending: boolean;
  includeCalendarEvent: boolean;
}

/**
 * Workflow information
 * Compatible with @calcom/features/ee/workflows/lib/types.Workflow
 */
export interface WorkflowDto {
  id: number;
  name: string;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStepDto[];
}

/**
 * Workflow on event type wrapper
 */
export interface WorkflowOnEventTypeDto {
  workflow: WorkflowDto;
}

/**
 * Parent event type reference
 */
export interface ParentEventTypeDto {
  teamId: number | null;
}

/**
 * Event type owner information
 */
export interface EventTypeOwnerDto {
  id: number;
  hideBranding: boolean;
}

/**
 * Event type information for confirmation flow
 */
export interface EventTypeForConfirmationDto {
  id: number;
  owner: EventTypeOwnerDto | null;
  teamId: number | null;
  recurringEvent: JsonValue;
  title: string;
  slug: string;
  requiresConfirmation: boolean;
  currency: string;
  length: number;
  description: string | null;
  price: number;
  bookingFields: JsonValue;
  hideOrganizerEmail: boolean;
  hideCalendarNotes: boolean;
  hideCalendarEventDetails: boolean;
  disableGuests: boolean;
  customReplyToEmail: string | null;
  metadata: JsonValue;
  locations: JsonValue;
  team: TeamSummaryDto | null;
  workflows: WorkflowOnEventTypeDto[];
  customInputs: JsonValue;
  parentId: number | null;
  parent: ParentEventTypeDto | null;
}

/**
 * Payment information
 */
export interface PaymentDto {
  id: number;
  uid: string;
  appId: string | null;
  bookingId: number;
  amount: number;
  fee: number;
  currency: string;
  success: boolean;
  refunded: boolean;
  data: JsonValue;
  externalId: string;
  paymentOption: PaymentOption | null;
}

/**
 * Full booking information for confirmation flow
 */
export interface BookingForConfirmationDto {
  id: number;
  uid: string;
  title: string;
  description: string | null;
  customInputs: JsonValue;
  startTime: Date;
  endTime: Date;
  attendees: AttendeeDto[];
  eventTypeId: number | null;
  responses: JsonValue;
  metadata: JsonValue;
  userPrimaryEmail: string | null;
  eventType: EventTypeForConfirmationDto | null;
  location: string | null;
  userId: number | null;
  user: BookingConfirmationUserDto | null;
  payment: PaymentDto[];
  destinationCalendar: DestinationCalendarDto | null;
  paid: boolean;
  recurringEventId: string | null;
  status: BookingStatus;
  smsReminderNumber: string | null;
}

/**
 * Result of update operations
 */
export interface BookingUpdateResultDto {
  id: number;
  uid: string;
  status: BookingStatus;
}

/**
 * Result of batch update operations
 */
export interface BookingBatchUpdateResultDto {
  count: number;
}

/**
 * Input for creating a booking reference
 */
export interface BookingReferenceCreateInput {
  type: string;
  uid: string;
  meetingId?: string | null;
  meetingPassword?: string | null;
  meetingUrl?: string | null;
  externalCalendarId?: string | null;
  credentialId?: number | null;
}

/**
 * Input for updating booking location
 */
export interface UpdateLocationInput {
  where: { id: number };
  data: {
    location: string;
    metadata: Record<string, unknown>;
    referencesToCreate: BookingReferenceCreateInput[];
    responses?: Record<string, unknown>;
    iCalSequence?: number;
  };
}

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
