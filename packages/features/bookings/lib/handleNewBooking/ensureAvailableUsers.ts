import type { Logger } from "tslog";

import { getBusyTimesForLimitChecks } from "@calcom/core/getBusyTimes";
import { getUsersAvailability } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma, { userSelect } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { checkForConflicts } from "../conflictChecker/checkForConflicts";
import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { BookingType, IsFixedAwareUser } from "./types";


type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

const getDateTimeInUtc = (timeInput: string, timeZone?: string) => {
  return timeZone === "Etc/GMT" ? dayjs.utc(timeInput) : dayjs(timeInput).tz(timeZone).utc();
};

const getOriginalBookingDuration = (originalBooking?: BookingType) => {
  return originalBooking
    ? dayjs(originalBooking.endTime).diff(dayjs(originalBooking.startTime), "minutes")
    : undefined;
};

const hasDateRangeForBooking = (
  dateRanges: DateRange[],
  startDateTimeUtc: dayjs.Dayjs,
  endDateTimeUtc: dayjs.Dayjs
) => {
  let dateRangeForBooking = false;

  for (const dateRange of dateRanges) {
    if (
      (startDateTimeUtc.isAfter(dateRange.start) || startDateTimeUtc.isSame(dateRange.start)) &&
      (endDateTimeUtc.isBefore(dateRange.end) || endDateTimeUtc.isSame(dateRange.end))
    ) {
      dateRangeForBooking = true;
      break;
    }
  }

  return dateRangeForBooking;
};

export async function ensureAvailableUsers(
  eventType: getEventTypeResponse & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string; originalRescheduledBooking?: BookingType },
  loggerWithEventDetails: Logger<unknown>
) {
  const availableUsers: IsFixedAwareUser[] = [];

  const startDateTimeUtc = getDateTimeInUtc(input.dateFrom, input.timeZone);
  const endDateTimeUtc = getDateTimeInUtc(input.dateTo, input.timeZone);

  const duration = dayjs(input.dateTo).diff(input.dateFrom, "minute");
  const originalBookingDuration = getOriginalBookingDuration(input.originalRescheduledBooking);

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);
  let attendeeUsers: IsFixedAwareUser[] = [];
  if (input.originalRescheduledBooking?.uid) {
    const attendeesEmails = input.originalRescheduledBooking?.attendees?.map((a) => a.email);
    if (attendeesEmails?.length) {
      let attendees = await prisma.user.findMany({
        where: {
          email: {
            in: attendeesEmails,
          },
        },
        select: {
          ...userSelect.select,
          credentials: {
            select: credentialForCalendarServiceSelect,
          },
        }
      });
      attendeeUsers = attendees.map((u) => {
        return {
          ...u,
          isFixed: true,
        };
      });
    }
  }
  const totalUsers = [...eventType.users, ...attendeeUsers].filter(
    (user, index, self) => index === self.findIndex((t) => t.id === user.id)
  );
  const busyTimesFromLimitsBookingsAllUsers: Awaited<ReturnType<typeof getBusyTimesForLimitChecks>> =
    eventType && (bookingLimits || durationLimits)
      ? await getBusyTimesForLimitChecks({
          userIds: [...totalUsers.map((u) => u.id)],
          eventTypeId: eventType.id,
          startDate: startDateTimeUtc.format(),
          endDate: endDateTimeUtc.format(),
          rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
          bookingLimits,
          durationLimits,
        })
      : [];

  const usersAvailability = await getUsersAvailability({
    users: totalUsers,
    query: {
      ...input,
      eventTypeId: eventType.id,
      duration: originalBookingDuration,
      returnDateOverrides: false,
      dateFrom: startDateTimeUtc.format(),
      dateTo: endDateTimeUtc.format(),
    },
    initialData: {
      eventType,
      rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
      busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
    },
  });

  usersAvailability.forEach(({ oooExcludedDateRanges: dateRanges, busy: bufferedBusyTimes }, index) => {
    const user = totalUsers[index];

    loggerWithEventDetails.debug(
      "calendarBusyTimes==>>>",
      JSON.stringify({ bufferedBusyTimes, dateRanges, isRecurringEvent: eventType.recurringEvent })
    );

    if (!dateRanges.length) {
      loggerWithEventDetails.error(
        `User does not have availability at this time.`,
        safeStringify({
          startDateTimeUtc,
          endDateTimeUtc,
          input,
        })
      );
      return;
    }

    //check if event time is within the date range
    if (!hasDateRangeForBooking(dateRanges, startDateTimeUtc, endDateTimeUtc)) {
      loggerWithEventDetails.error(
        `No date range for booking.`,
        safeStringify({
          startDateTimeUtc,
          endDateTimeUtc,
          input,
        })
      );
      return;
    }

    try {
      const foundConflict = checkForConflicts(bufferedBusyTimes, startDateTimeUtc, duration);
      // no conflicts found, add to available users.
      if (!foundConflict) {
        availableUsers.push(user);
      }
    } catch (error) {
      loggerWithEventDetails.error("Unable set isAvailableToBeBooked. Using true. ", error);
    }
  });

  if (input.originalRescheduledBooking?.uid) {
    const fixedAvailableUsers = availableUsers.filter((u) => u.isFixed);
    const fixedTotalUsers = totalUsers.filter((u) => u.isFixed);
    if(fixedAvailableUsers.length !== fixedTotalUsers.length) {
      loggerWithEventDetails.error(
        `Not all users are available for rescheduled booking.`,
        safeStringify({
          startDateTimeUtc,
          endDateTimeUtc,
          input,
        })
      );
      throw new Error(ErrorCode.NoAvailableSlotsFound);
    }
  } else if (!availableUsers.length) {
    loggerWithEventDetails.error(
      `No available users found.`,
      safeStringify({
        startDateTimeUtc,
        endDateTimeUtc,
        input,
      })
    );
    throw new Error(ErrorCode.NoAvailableUsersFound);
  }

  return availableUsers;
}
