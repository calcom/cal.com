/**
 * Booking DTOs - Data Transfer Objects for booking data
 */

import type { JsonValue } from "@calcom/types/JsonObject";

/**
 * Booking status values (ORM-agnostic string literal union)
 */
export type BookingStatusDto =
  | "CANCELLED"
  | "ACCEPTED"
  | "REJECTED"
  | "PENDING"
  | "AWAITING_HOST";

import type { AttendeeDto } from "./AttendeeDto";
import type { BookingReferenceCreateInput, BookingReferenceDto } from "./BookingReferenceDto";
import type { DestinationCalendarDto } from "./DestinationCalendarDto";
import type { EventTypeForConfirmationDto, EventTypeWithTeamDto } from "./EventTypeDto";
import type { PaymentDto } from "./PaymentDto";
import type { BookingConfirmationUserDto, BookingUserDto } from "./UserDto";

/**
 * Basic booking information returned by findByUidBasic
 */
export interface BookingBasicDto {
  id: number;
  uid: string;
  startTime: Date;
  endTime: Date;
  description: string | null;
  status: BookingStatusDto;
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
  status: BookingStatusDto;
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
  status: BookingStatusDto;
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
  status: BookingStatusDto;
  smsReminderNumber: string | null;
}

/**
 * Result of update operations
 */
export interface BookingUpdateResultDto {
  id: number;
  uid: string;
  status: BookingStatusDto;
}

/**
 * Result of batch update operations
 */
export interface BookingBatchUpdateResultDto {
  count: number;
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
