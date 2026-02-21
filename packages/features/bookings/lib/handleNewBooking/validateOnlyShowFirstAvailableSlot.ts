import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { IsFixedAwareUser } from "./types";

type ValidateOnlyShowFirstAvailableSlotEventType = Pick<
  getEventTypeResponse,
  "onlyShowFirstAvailableSlot" | "id" | "timeZone" | "schedule"
> & {
  users: IsFixedAwareUser[];
};

interface ValidateOnlyShowFirstAvailableSlotInput {
  reqBodyStartTime: string;
  reqBodyTimeZone: string;
  eventType: ValidateOnlyShowFirstAvailableSlotEventType;
  logger: Logger<unknown>;
}

/**
 * Validates that when onlyShowFirstAvailableSlot is enabled, the requested booking time
 * is the first available slot of the day. This prevents users from bypassing the restriction
 * by manipulating URL parameters or calling the API directly.
 *
 * The validation works by:
 * 1. Getting the user's availability for the requested day
 * 2. Finding the first available slot of that day
 * 3. Comparing it with the requested booking time
 * 4. Rejecting if they don't match
 */
const _validateOnlyShowFirstAvailableSlot = async ({
  reqBodyStartTime,
  reqBodyTimeZone,
  eventType,
  logger,
}: ValidateOnlyShowFirstAvailableSlotInput): Promise<void> => {
  // Skip validation if onlyShowFirstAvailableSlot is not enabled
  if (!eventType.onlyShowFirstAvailableSlot) {
    return;
  }

  // Get the event timezone (fallback to schedule timezone or UTC)
  const eventTimeZone = eventType.timeZone || eventType.schedule?.timeZone || "UTC";

  // Parse the requested start time
  const requestedStartTime = dayjs(reqBodyStartTime);

  // Get the date in the event's timezone to determine which day this booking is for
  const requestedDateInEventTz = requestedStartTime.tz(eventTimeZone);
  const requestedDateStr = requestedDateInEventTz.format("YYYY-MM-DD");

  // For users with availability data, check if the requested slot is the first available
  // The availability data is populated by ensureAvailableUsers before this validation runs
  for (const user of eventType.users) {
    const availabilityData = user.availabilityData;
    if (!availabilityData) {
      continue;
    }

    // Get the date ranges (available time slots) for this user
    const { oooExcludedDateRanges: dateRanges } = availabilityData;

    if (!dateRanges || dateRanges.length === 0) {
      continue;
    }

    // Find the first available slot on the requested date
    // Date ranges are sorted by start time, so we find the first one that falls on the requested date
    const firstSlotOnRequestedDate = dateRanges.find((range) => {
      const rangeStartInEventTz = dayjs(range.start).tz(eventTimeZone);
      return rangeStartInEventTz.format("YYYY-MM-DD") === requestedDateStr;
    });

    if (!firstSlotOnRequestedDate) {
      // No available slots on this date - this will be caught by other validations
      continue;
    }

    // Compare the requested time with the first available slot
    // We compare at minute precision to handle slight differences in seconds/milliseconds
    const firstSlotStart = dayjs(firstSlotOnRequestedDate.start);
    const requestedStart = dayjs(reqBodyStartTime);

    // Check if the requested time matches the first available slot (within 1 minute tolerance)
    const diffInMinutes = Math.abs(requestedStart.diff(firstSlotStart, "minute"));

    if (diffInMinutes > 0) {
      logger.warn({
        message: "Booking rejected: onlyShowFirstAvailableSlot is enabled but requested slot is not the first available",
        eventTypeId: eventType.id,
        requestedTime: reqBodyStartTime,
        firstAvailableTime: firstSlotStart.toISOString(),
        requestedDate: requestedDateStr,
      });

      throw new HttpError({
        statusCode: 400,
        message: ErrorCode.BookingNotFirstAvailableSlot,
      });
    }
  }
};

export const validateOnlyShowFirstAvailableSlot = withReporting(
  _validateOnlyShowFirstAvailableSlot,
  "validateOnlyShowFirstAvailableSlot"
);
