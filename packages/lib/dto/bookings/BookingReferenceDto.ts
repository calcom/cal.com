/**
 * Booking Reference DTOs - Data Transfer Objects for booking reference data
 */

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
