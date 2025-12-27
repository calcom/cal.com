/**
 * Attendee DTOs - Data Transfer Objects for attendee data
 */

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
