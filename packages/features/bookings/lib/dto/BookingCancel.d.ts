/**
 * Domain types for Booking Cancellation Service
 * These types are framework-agnostic and contain only the data required for booking cancellation operations
 */
import type { z } from "zod";

import type { bookingCancelInput } from "@calcom/prisma/zod-utils";

import type { Actor } from "../types/actor";

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
  /**
   * The actor performing the cancellation.
   * Used for audit logging to track who cancelled the booking.
   * Optional for backward compatibility - defaults to System actor if not provided.
   */
  actor?: Actor;
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
};
