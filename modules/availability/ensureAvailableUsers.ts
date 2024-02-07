import { Prisma } from "@prisma/client";
import type { Logger } from "tslog";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import { getEventTypesFromDB } from "../eventTypes/getEventTypesFromDB"
import { userSelect } from "@calcom/prisma";
import { getOriginalRescheduledBooking } from "../booking/getOriginalRescheduledBooking";
import { checkForConflicts } from "../conflictChecker/checkForConflicts";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { getBusyTimesForLimitChecks } from "@calcom/core/getBusyTimes";

type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;
const log = logger.getSubLogger({ prefix: ["[api] book:user"] });
type User = Prisma.UserGetPayload<typeof userSelect>;

type IsFixedAwareUser = User & {
  isFixed: boolean;
  credentials: CredentialPayload[];
  organization: { slug: string };
};

export async function ensureAvailableUsers(
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>> & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string; originalRescheduledBooking?: BookingType },
  loggerWithEventDetails: Logger<unknown>
) {
  const availableUsers: IsFixedAwareUser[] = [];
  const duration = dayjs(input.dateTo).diff(input.dateFrom, "minute");

  const originalBookingDuration = input.originalRescheduledBooking
    ? dayjs(input.originalRescheduledBooking.endTime).diff(
      dayjs(input.originalRescheduledBooking.startTime),
      "minutes"
    )
    : undefined;

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);
  let busyTimesFromLimitsBookingsAllUsers: Awaited<ReturnType<typeof getBusyTimesForLimitChecks>> = [];

  if (eventType && (bookingLimits || durationLimits)) {
    busyTimesFromLimitsBookingsAllUsers = await getBusyTimesForLimitChecks({
      userIds: eventType.users.map((u) => u.id),
      eventTypeId: eventType.id,
      startDate: input.dateFrom,
      endDate: input.dateTo,
      rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
      bookingLimits,
      durationLimits,
    });
  }

  /** Let's start checking for availability */
  for (const user of eventType.users) {
    const { dateRanges, busy: bufferedBusyTimes } = await getUserAvailability(
      {
        userId: user.id,
        eventTypeId: eventType.id,
        duration: originalBookingDuration,
        returnDateOverrides: false,
        ...input,
      },
      {
        user,
        eventType,
        rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
        busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers.filter((b) => b.userId === user.id),
      }
    );

    log.debug(
      "calendarBusyTimes==>>>",
      JSON.stringify({ bufferedBusyTimes, dateRanges, isRecurringEvent: eventType.recurringEvent })
    );

    if (!dateRanges.length) {
      // user does not have availability at this time, skip user.
      continue;
    }

    let foundConflict = false;

    let dateRangeForBooking = false;

    //check if event time is within the date range
    for (const dateRange of dateRanges) {
      if (
        (dayjs.utc(input.dateFrom).isAfter(dateRange.start) ||
          dayjs.utc(input.dateFrom).isSame(dateRange.start)) &&
        (dayjs.utc(input.dateTo).isBefore(dateRange.end) || dayjs.utc(input.dateTo).isSame(dateRange.end))
      ) {
        dateRangeForBooking = true;
        break;
      }
    }

    if (!dateRangeForBooking) {
      continue;
    }

    try {
      foundConflict = checkForConflicts(bufferedBusyTimes, input.dateFrom, duration);
    } catch {
      log.debug({
        message: "Unable set isAvailableToBeBooked. Using true. ",
      });
    }
    // no conflicts found, add to available users.
    if (!foundConflict) {
      availableUsers.push(user);
    }
  }
  if (!availableUsers.length) {
    loggerWithEventDetails.error(`No available users found.`);
    throw new Error(ErrorCode.NoAvailableUsersFound);
  }
  return availableUsers;
}