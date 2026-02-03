/**
 * Domain types for Booking Cancellation Service
 * These types are framework-agnostic and contain only the data required for booking cancellation operations
 */
import type { z } from "zod";

import type { bookingCancelInput } from "@calcom/prisma/zod-utils";

/**
 * The booking data required for cancellation
 */
export type CancelRegularBookingData = z.infer<typeof bookingCancelInput>;

/**
 * Additional metadata for booking cancellation, typically used for platform integrations
 */
export type CancelBookingMeta = {
  userId?: number;
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  arePlatformEmailsEnabled?: boolean;
};

/**
 * The response returned after attempting to cancel a booking
 */
export type HandleCancelBookingResponse = {
  success: boolean;
  message: string;
  onlyRemovedAttendee: boolean;
  bookingId: number;
  bookingUid: string;
  isPlatformManagedUserBooking: boolean;
};
