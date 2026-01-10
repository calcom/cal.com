import { URLSearchParams } from "url";

import { getFullName } from "@calcom/features/form-builder/utils";
import { ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS } from "@calcom/lib/constants";
import { getSafe } from "@calcom/lib/getSafe";
import { BookingStatus } from "@calcom/prisma/enums";
import type { JsonValue } from "@calcom/types/Json";

import { isWithinMinimumRescheduleNotice } from "./isWithinMinimumRescheduleNotice";

export type ReschedulePreventionRedirectInput = {
  booking: {
    uid: string;
    status: BookingStatus;
    startTime: Date | null;
    endTime: Date | null;
    responses?: JsonValue;
    userId: number | null; // Booking organizer's user ID
    eventType: {
      disableRescheduling: boolean;
      allowReschedulingPastBookings: boolean;
      allowBookingFromCancelledBookingReschedule: boolean;
      minimumRescheduleNotice: number | null;
      teamId: number | null;
    };
  };
  eventUrl: string;
  forceRescheduleForCancelledBooking?: boolean;
  currentUserId?: number | null; // Currently authenticated user's ID (if any)
  bookingSeat?: {
    data: JsonValue;
    booking: {
      uid: string;
      id: number;
    };
  };
};

export type ReschedulePreventionRedirectResult = string | null;

/**
 *
 * Parses the PAST_BOOKING_RESCHEDULE_NO_BOOKING_BEHAVIOUR environment variable and checks if the given team ID has the changed behaviour for past booking reschedule enabled
 *
 * The behaviour is that it does not allow allowing booking through the reschedule link of a past booking by default. If allowReschedulingPastBookings is true, then this behaviour isn't applicable
 */
function isPastBookingRescheduleBehaviourToPreventBooking(teamId: number | null | undefined): boolean {
  if (!teamId) {
    return false;
  }

  if (!ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS) {
    return false;
  }

  const configuredTeamIds = ENV_PAST_BOOKING_RESCHEDULE_CHANGE_TEAM_IDS.split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  return configuredTeamIds.includes(teamId);
}

/**
 * Determines the appropriate redirect URL for a reschedule request based on booking status and event type settings
 * Returns the redirect URL string if a redirect is needed, null if reschedule should proceed normally
 */
export function determineReschedulePreventionRedirect(
  input: ReschedulePreventionRedirectInput
): ReschedulePreventionRedirectResult {
  const { booking, eventUrl, forceRescheduleForCancelledBooking, bookingSeat } = input;

  const isDisabledRescheduling = booking.eventType.disableRescheduling;
  if (isDisabledRescheduling) {
    return `/booking/${booking.uid}`;
  }

  const isNonRescheduleableBooking =
    booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED;
  const isForcedRescheduleForCancelledBooking = forceRescheduleForCancelledBooking;

  if (isNonRescheduleableBooking && !isForcedRescheduleForCancelledBooking) {
    const canBookThroughCancelledBookingRescheduleLink =
      booking.eventType.allowBookingFromCancelledBookingReschedule;
    const allowedToBeBookedThroughCancelledBookingRescheduleLink =
      booking.status === BookingStatus.CANCELLED && canBookThroughCancelledBookingRescheduleLink;

    return allowedToBeBookedThroughCancelledBookingRescheduleLink ? eventUrl : `/booking/${booking.uid}`;
  }

  // Check if rescheduling is prevented due to minimum reschedule notice
  // Only apply this restriction if the user is NOT the booking organizer
  const isUserOrganizer = input.currentUserId && booking.userId && input.currentUserId === booking.userId;
  const { minimumRescheduleNotice } = booking.eventType;
  if (
    !isUserOrganizer &&
    isWithinMinimumRescheduleNotice(booking.startTime, minimumRescheduleNotice ?? null)
  ) {
    // Rescheduling is not allowed within the minimum notice period (only for non-organizers)
    return `/booking/${booking.uid}`;
  }

  const isBookingInPast = booking.endTime && new Date(booking.endTime) < new Date();
  if (isBookingInPast && !booking.eventType.allowReschedulingPastBookings) {
    // Check if this team should apply the redirect behavior for past bookings
    const isNewPastBookingRescheduleBehaviour = isPastBookingRescheduleBehaviourToPreventBooking(
      booking.eventType.teamId
    );

    if (isNewPastBookingRescheduleBehaviour) {
      return `/booking/${booking.uid}`;
    }

    const destinationUrlSearchParams = new URLSearchParams();
    const responses = bookingSeat ? getSafe<string>(bookingSeat.data, ["responses"]) : booking.responses;
    const name = getFullName(getSafe<string | { firstName: string; lastName?: string }>(responses, ["name"]));
    const email = getSafe<string>(responses, ["email"]);

    if (name) destinationUrlSearchParams.set("name", name);
    if (email) destinationUrlSearchParams.set("email", email);

    const searchParamsString = destinationUrlSearchParams.toString();
    return searchParamsString ? `${eventUrl}?${searchParamsString}` : eventUrl;
  }

  // Allow reschedule to proceed - default behaviour
  return null;
}
