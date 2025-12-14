/**
 * User DTOs - Data Transfer Objects for user data
 */

import type { CredentialDto } from "./CredentialDto";
import type { DestinationCalendarDto } from "./DestinationCalendarDto";

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
