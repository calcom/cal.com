/**
 * Booking Utilities
 *
 * Shared utility functions for working with bookings.
 */

import type { Booking } from "@/services/calcom";

/**
 * Extract the meeting URL from a booking.
 *
 * Checks both the booking's responses.videoCallUrl and location fields
 * for a valid HTTP(S) URL that can be used to join the meeting.
 *
 * @param booking - The booking to extract the meeting URL from
 * @returns The meeting URL if found, null otherwise
 *
 * @example
 * ```tsx
 * const meetingUrl = getMeetingUrl(booking);
 * if (meetingUrl) {
 *   openInDefaultBrowser(meetingUrl, "meeting link");
 * }
 * ```
 */
export const getMeetingUrl = (booking: Booking | null): string | null => {
  if (!booking) return null;

  // Check metadata for videoCallUrl first
  const videoCallUrl = booking.responses?.videoCallUrl;
  if (typeof videoCallUrl === "string" && videoCallUrl.startsWith("http")) {
    return videoCallUrl;
  }

  // Check location
  const location = booking.location;
  if (typeof location === "string" && location.startsWith("http")) {
    return location;
  }

  return null;
};
