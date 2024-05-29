import type { EventType } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import { ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK } from "./constants";
import logger from "./logger";
import { safeStringify } from "./safeStringify";

export class BookingDateInPastError extends Error {
  constructor(message = "Attempting to book a meeting in the past.") {
    super(message);
  }
}

function guardAgainstBookingInThePast(date: Date) {
  if (date >= new Date()) {
    // Date is in the future.
    return;
  }
  throw new BookingDateInPastError();
}

/**
 * Dates passed to this function are timezone neutral.
 */
export function calculatePeriodLimits({
  periodType,
  periodDays,
  periodCountCalendarDays,
  periodStartDate,
  periodEndDate,
  /**
   * These dates will be considered in the same utfcOffset as provided
   */
  allDatesWithBookabilityStatus,
  utcOffset,
  /**
   * This is temporary till we find a way to provide allDatesWithBookabilityStatus in handleNewBooking without re-computing availability.
   * It is okay for handleNewBooking to pass it as true as the frontend won't allow selecting a timeslot that is out of bounds of ROLLING_WINDOW
   * But for the booking that happen through API, we absolutely need to check the ROLLING_WINDOW limits.
   */
  _skipRollingWindowCheck,
}: Pick<
  EventType,
  "periodType" | "periodDays" | "periodCountCalendarDays" | "periodStartDate" | "periodEndDate"
> & {
  allDatesWithBookabilityStatus: Record<string, { isBookable: boolean }> | null;
  utcOffset: number;
  _skipRollingWindowCheck?: boolean;
}): PeriodLimits {
  const currentTime = dayjs().utcOffset(utcOffset);
  periodDays = periodDays || 0;

  switch (periodType) {
    case PeriodType.ROLLING: {
      const rollingEndDay = periodCountCalendarDays
        ? currentTime.add(periodDays, "days").endOf("day")
        : currentTime.businessDaysAdd(periodDays).endOf("day");
      return { rollingEndDay, rangeStartDay: null, rangeEndDay: null };
    }

    case PeriodType.ROLLING_WINDOW: {
      if (_skipRollingWindowCheck) {
        return { rollingEndDay: null, rangeStartDay: null, rangeEndDay: null };
      }

      if (!allDatesWithBookabilityStatus) {
        throw new Error("`allDatesWithBookabilityStatus` is required");
      }

      const rollingEndDay = getRollingWindowEndDate({
        startDate: currentTime,
        daysNeeded: periodDays,
        allDatesWithBookabilityStatus,
        countNonBusinessDays: periodCountCalendarDays,
      });

      return { rollingEndDay, rangeStartDay: null, rangeEndDay: null };
    }

    case PeriodType.RANGE: {
      const rangeStartDay = dayjs(periodStartDate).utcOffset(utcOffset).startOf("day");
      const rangeEndDay = dayjs(periodEndDate).utcOffset(utcOffset).endOf("day");

      return {
        rollingEndDay: null,
        rangeStartDay,
        rangeEndDay,
      };
    }
  }

  return {
    rollingEndDay: null,
    rangeStartDay: null,
    rangeEndDay: null,
  };
}

export function getRollingWindowEndDate({
  startDate,
  daysNeeded,
  allDatesWithBookabilityStatus,
  countNonBusinessDays,
}: {
  /**
   * It should be provided in the same utcOffset as the dates in `allDatesWithBookabilityStatus`
   * This is because we do a lookup by day in `allDatesWithBookabilityStatus`
   */
  startDate: dayjs.Dayjs;
  daysNeeded: number;
  allDatesWithBookabilityStatus: Record<string, { isBookable: boolean }>;
  countNonBusinessDays: boolean | null;
}) {
  const log = logger.getSubLogger({ prefix: ["getRollingWindowEndDate"] });
  log.debug("called:", safeStringify({ startDay: startDate.format(), daysNeeded }));
  let counter = 1;
  let rollingEndDay;
  let currentDate = startDate.startOf("day");

  // It helps to break out of the loop if we don't find enough bookable days.
  const maxDaysToCheck = ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK;

  let bookableDaysCount = 0;

  // Add periodDays to currentDate, skipping non-bookable days.
  while (bookableDaysCount < daysNeeded) {
    // What if we don't find any bookable days. We should break out of the loop after a certain number of days.
    if (counter > maxDaysToCheck) {
      break;
    }

    const isBookable = !!allDatesWithBookabilityStatus[currentDate.format("YYYY-MM-DD")]?.isBookable;

    if (isBookable) {
      bookableDaysCount++;
      rollingEndDay = currentDate;
    }

    log.silly(
      `Loop Iteration: ${counter}`,
      safeStringify({
        currentDate: currentDate.format(),
        isBookable,
        bookableDaysCount,
        rollingEndDay: rollingEndDay?.format(),
      })
    );

    currentDate = countNonBusinessDays ? currentDate.add(1, "days") : currentDate.businessDaysAdd(1);

    counter++;
  }

  /**
   * We can't just return null(if rollingEndDay couldn't be obtained) and allow days farther than ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK to be booked as that would mean there is no future limit
   */
  const rollingEndDayOrLastPossibleDayAsPerLimit = rollingEndDay ?? currentDate;
  log.debug("Returning rollingEndDay", rollingEndDayOrLastPossibleDayAsPerLimit.format());

  // Return endOfDay so that any timeslot in the last day is considered within bounds
  return rollingEndDayOrLastPossibleDayAsPerLimit.endOf("day");
}

/**
 * To be used when we work on Timeslots(and not Dates) to check boundaries
 * It ensures that the time isn't in the past and also checks if the time is within the minimum booking notice.
 */
export function isTimeOutOfBounds({
  time,
  minimumBookingNotice,
}: {
  time: dayjs.ConfigType;
  minimumBookingNotice?: number;
}) {
  const date = dayjs(time);

  guardAgainstBookingInThePast(date.toDate());

  if (minimumBookingNotice) {
    const minimumBookingStartDate = dayjs().add(minimumBookingNotice, "minutes");
    if (date.isBefore(minimumBookingStartDate)) {
      return true;
    }
  }

  return false;
}

type PeriodLimits = {
  rollingEndDay: dayjs.Dayjs | null;
  rangeStartDay: dayjs.Dayjs | null;
  rangeEndDay: dayjs.Dayjs | null;
};

/**
 * To be used when we work on just Dates(and not specific timeslots) to check boundaries
 * e.g. It checks for Future Limits which operate on dates and not times.
 */
export function isDateOutOfBounds({
  dateString,
  periodLimits,
}: {
  dateString: dayjs.ConfigType;
  periodLimits: PeriodLimits;
  _skipRollingWindowCheck?: boolean;
}) {
  const log = logger.getSubLogger({ prefix: ["isDateOutOfBounds"] });
  const date = dayjs(dateString);

  log.debug(
    safeStringify({
      dateString,
      endOfDay: date.format(),
      periodLimits: {
        rollingEndDay: periodLimits.rollingEndDay?.format(),
        rangeStartDay: periodLimits.rangeStartDay?.format(),
        rangeEndDay: periodLimits.rangeEndDay?.format(),
      },
    })
  );

  if (periodLimits.rollingEndDay) {
    const isAfterRollingEndDay = date.isAfter(periodLimits.rollingEndDay);
    log.debug({
      dateString,
      endOfDay: date.format(),
      isAfterRollingEndDay,
      rollingEndDay: periodLimits.rollingEndDay.format(),
    });
    return isAfterRollingEndDay;
  }

  if (periodLimits.rangeStartDay && periodLimits.rangeEndDay) {
    return date.isBefore(periodLimits.rangeStartDay) || date.isAfter(periodLimits.rangeEndDay);
  }
  return false;
}

export default function isOutOfBounds(
  time: dayjs.ConfigType,
  {
    periodType,
    periodDays,
    periodCountCalendarDays,
    periodStartDate,
    periodEndDate,
    utcOffset,
  }: Pick<
    EventType,
    "periodType" | "periodDays" | "periodCountCalendarDays" | "periodStartDate" | "periodEndDate"
  > & {
    utcOffset: number;
  },
  minimumBookingNotice?: number
) {
  return (
    isTimeOutOfBounds({ time, minimumBookingNotice }) ||
    isDateOutOfBounds({
      dateString: time,
      periodLimits: calculatePeriodLimits({
        periodType,
        periodDays,
        periodCountCalendarDays,
        periodStartDate,
        periodEndDate,
        // Temporary till we find a way to provide allDatesWithBookabilityStatus in handleNewBooking without re-computing availability for the booked timeslot
        allDatesWithBookabilityStatus: null,
        _skipRollingWindowCheck: true,
        utcOffset,
      }),
    })
  );
}
