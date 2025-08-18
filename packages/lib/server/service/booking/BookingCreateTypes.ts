/**
 * Domain types for BookingCreateService
 * These types are framework-agnostic and contain only the data required for booking operations
 */

export interface BookingAttendee {
  name: string;
  email?: string;
  phoneNumber?: string;
  timeZone: string;
  language?: string;
}

export interface BookingRouting {
  responseId: number;
  teamMemberIds: number[];
  teamMemberEmail?: string;
  skipContactOwner?: boolean;
  crmAppSlug?: string;
  crmOwnerRecordType?: string;
}

export interface BookingLocation {
  type: string;
  [key: string]: any; // Allow flexible location data based on type
}

export interface BaseBookingInput {
  // Event identification - one of these combinations is required:
  // 1. eventTypeId
  // 2. eventTypeSlug + username
  // 3. eventTypeSlug + teamSlug
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  teamSlug?: string;
  organizationSlug?: string;

  // Core booking data
  start: string; // ISO 8601 format
  attendee: BookingAttendee;

  // Optional fields
  guests?: string[];
  meetingUrl?: string; // Deprecated - use location instead
  location?: BookingLocation | string;
  bookingFieldsResponses?: Record<string, unknown>;
  metadata?: Record<string, string>;
  lengthInMinutes?: number;
  routing?: BookingRouting;
  bookingUid?: string; // Present for seated bookings
}

export type CreateBookingInput = BaseBookingInput;

export interface CreateRecurringBookingInput extends BaseBookingInput {
  recurrenceCount?: number;
}

export interface CreateInstantBookingInput extends Omit<BaseBookingInput, "start"> {
  instant: boolean;
  start?: string; // Optional for instant bookings
}

export interface CreateSeatedBookingInput extends BaseBookingInput {
  bookingUid: string; // Required for seated bookings
}

/**
 * Generic booking data that could be any of the above types
 * Used for auto-routing in the create method
 */
export type BookingData =
  | CreateBookingInput
  | CreateRecurringBookingInput
  | CreateInstantBookingInput
  | CreateSeatedBookingInput;

/**
 * Type guards for identifying booking types
 */
export function isRecurringBooking(data: any): data is CreateRecurringBookingInput {
  return "recurrenceCount" in data && data.recurrenceCount;
}

export function isInstantBooking(data: any): data is CreateInstantBookingInput {
  return "instant" in data && data.instant === true;
}

export function isSeatedBooking(data: any): data is CreateSeatedBookingInput {
  return "bookingUid" in data && data.bookingUid;
}

export function hasStartTime(data: any): boolean {
  return "start" in data;
}
