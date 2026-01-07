/**
 * useBookingActionsGating Hook
 *
 * This hook provides the booking actions state using the centralized gating utility.
 * It computes which actions are visible and enabled for a given booking.
 */

import { useMemo } from "react";
import type { Booking } from "@/services/calcom";
import type { EventType } from "@/services/types/event-types.types";
import {
  type BookingActionsResult,
  getBookingActions,
  type NormalizedBooking,
  normalizeBooking,
} from "@/utils/booking-actions";

interface UseBookingActionsGatingParams {
  booking: Booking | null;
  eventType?: EventType | null;
  currentUserId?: number;
  currentUserEmail?: string;
  isOnline?: boolean;
}

interface UseBookingActionsGatingResult {
  actions: BookingActionsResult;
  normalizedBooking: NormalizedBooking | null;
}

/**
 * Default actions result when no booking is provided
 */
const defaultActions: BookingActionsResult = {
  reschedule: { visible: false, enabled: false },
  rescheduleRequest: { visible: false, enabled: false },
  cancel: { visible: false, enabled: false },
  changeLocation: { visible: false, enabled: false },
  addGuests: { visible: false, enabled: false },
  viewRecordings: { visible: false, enabled: false },
  meetingSessionDetails: { visible: false, enabled: false },
  markNoShow: { visible: false, enabled: false },
};

/**
 * Hook to compute booking actions visibility and enabled state.
 *
 * @param params - Parameters including booking, eventType, and user info
 * @returns Actions result and normalized booking
 */
export function useBookingActionsGating({
  booking,
  eventType,
  currentUserId,
  currentUserEmail,
  isOnline = true,
}: UseBookingActionsGatingParams): UseBookingActionsGatingResult {
  // Normalize the booking and compute actions
  const result = useMemo(() => {
    if (!booking) {
      return {
        actions: defaultActions,
        normalizedBooking: null,
      };
    }

    const normalizedBooking = normalizeBooking(booking);
    const actions = getBookingActions({
      booking: normalizedBooking,
      eventType,
      currentUserId,
      currentUserEmail,
      isOnline,
    });

    return {
      actions,
      normalizedBooking,
    };
  }, [booking, eventType, currentUserId, currentUserEmail, isOnline]);

  return result;
}

/**
 * Helper hook to get simple boolean flags for backward compatibility.
 * This can be used by components that still need the old-style flags.
 */
export function useBookingStatusFlags(booking: Booking | null) {
  return useMemo(() => {
    if (!booking) {
      return {
        isUpcoming: false,
        isPast: false,
        isOngoing: false,
        isCancelled: false,
        isRejected: false,
        isPending: false,
        isConfirmed: false,
      };
    }

    const normalized = normalizeBooking(booking);
    const now = new Date();

    const isPast = normalized.endTime < now;
    const isUpcoming = normalized.endTime >= now;
    const isOngoing = isUpcoming && now >= normalized.startTime;

    return {
      isUpcoming,
      isPast,
      isOngoing,
      isCancelled: normalized.status === "cancelled",
      isRejected: normalized.status === "rejected",
      isPending: normalized.status === "pending",
      isConfirmed: normalized.status === "accepted",
    };
  }, [booking]);
}
