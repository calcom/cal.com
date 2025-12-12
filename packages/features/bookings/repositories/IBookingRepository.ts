import type { BookingStatus } from "@calcom/prisma/enums";

/**
 * ORM-agnostic interface for BookingRepository
 * This interface defines the contract for booking data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface BookingAttendeeDto {
  id: number;
  email: string;
  name: string;
  timeZone: string;
  phoneNumber: string | null;
  locale: string | null;
  bookingId: number | null;
  noShow: boolean | null;
}

export interface BookingMinimalDto {
  id: number;
  uid: string;
  userId: number | null;
  startTime: Date;
  endTime: Date;
  title: string;
  status: BookingStatus;
}

export interface BookingWithEventTypeTeamIdDto {
  userId: number | null;
  eventType: {
    teamId: number | null;
  } | null;
}

export interface BookingForAuthorizationCheckDto {
  id: number;
  uid: string;
  userId: number | null;
  eventTypeId: number | null;
  status: BookingStatus;
  user: {
    id: number;
    email: string;
  } | null;
  attendees: {
    email: string;
  }[];
  eventType: {
    teamId: number | null;
    parent: {
      teamId: number | null;
    } | null;
    hosts: {
      userId: number;
      user: {
        email: string;
      };
    }[];
    users: {
      id: number;
      email: string;
    }[];
  } | null;
}

export interface IBookingRepository {
  /**
   * Get all attendees for a booking
   */
  getBookingAttendees(bookingId: number): Promise<BookingAttendeeDto[]>;

  /**
   * Get booking with event type team ID
   */
  getBookingWithEventTypeTeamId(params: {
    bookingId: number;
  }): Promise<BookingWithEventTypeTeamIdDto | null>;

  /**
   * Find booking by UID including event type details
   */
  findByUidIncludeEventType(params: {
    bookingUid: string;
  }): Promise<BookingForAuthorizationCheckDto | null>;

  /**
   * Find booking by ID including event type details
   */
  findByIdIncludeEventType(params: {
    bookingId: number;
  }): Promise<BookingForAuthorizationCheckDto | null>;

  /**
   * Find booking by UID for authorization check
   */
  findByUidForAuthorizationCheck(params: { bookingUid: string }): Promise<unknown>;

  /**
   * Find booking by UID for details
   */
  findByUidForDetails(params: { bookingUid: string }): Promise<unknown>;

  /**
   * Find booking by UID
   */
  findBookingByUid(params: { bookingUid: string }): Promise<BookingMinimalDto | null>;

  /**
   * Update booking location by ID
   */
  updateLocationById(params: {
    bookingId: number;
    location: string;
    referencesToCreate: {
      type: string;
      uid: string;
      meetingId?: string;
      meetingPassword?: string;
      meetingUrl?: string;
    }[];
    referencesToDelete: { type: string }[];
  }): Promise<{ references: { type: string; meetingUrl: string | null }[] }>;

  /**
   * Update booking status
   */
  updateBookingStatus(params: {
    bookingId: number;
    status: BookingStatus;
  }): Promise<{ id: number; status: BookingStatus }>;
}
