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
   * These dates will be considered in the same utcOffset as provided
   */
  allDatesWithBookabilityStatus,
  utcOffset,
}: Pick<
  EventType,
  "periodType" | "periodDays" | "periodCountCalendarDays" | "periodStartDate" | "periodEndDate"
> & {
  allDatesWithBookabilityStatus: Record<string, { isBookable: boolean }>;
  utcOffset: number;
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
      const rollingEndDay = getRollingWindowLastDay({
        startDay: currentTime,
        neededDays: periodDays,
        allDatesWithBookabilityStatus,
        shouldConsiderNonBusinessDaysToo: periodCountCalendarDays,
      });

      return { rollingEndDay, rangeStartDay: null, rangeEndDay: null };
    }

    case PeriodType.RANGE: {
      const rangeStartDay = dayjs(periodStartDate).utcOffset(utcOffset).endOf("day");
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

/**
 * TODO: Unit Test this function
 */
function getRollingWindowLastDay({
  startDay,
  neededDays,
  allDatesWithBookabilityStatus,
  shouldConsiderNonBusinessDaysToo,
}: {
  startDay: dayjs.Dayjs;
  neededDays: number;
  allDatesWithBookabilityStatus: Record<string, { isBookable: boolean }>;
  shouldConsiderNonBusinessDaysToo: boolean | null;
}) {
  const log = logger.getSubLogger({ prefix: ["getRollingWindowLastDay"] });
  let counter = 1;
  let rollingEndDay;
  let currentDate = startDay.startOf("day");

  // It helps to break out of the loop if we don't find enough bookable days.
  const maxDaysToCheck = ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK;

  let bookableDaysCount = 0;
  // Add periodDays to currentDate, skipping non-bookable days.
  while (bookableDaysCount < neededDays) {
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
        currentDate: currentDate.format("YYYY-MM-DD"),
        isBookable,
        bookableDaysCount,
        rollingEndDay: rollingEndDay?.format("YYYY-MM-DD"),
      })
    );

    currentDate = shouldConsiderNonBusinessDaysToo
      ? currentDate.add(1, "days").endOf("day")
      : currentDate.businessDaysAdd(1).endOf("day");

    counter++;
  }
  log.debug("Returning rollingEndDay", rollingEndDay);
  return rollingEndDay;
}

/**
 * To be used when we work on Timeslots(and not Dates) to check boundaries
 * It ensures that the time isn't in the past and also checks if the time is within the minimum booking notice.
 */
export function isTimeOutOfBounds({
  time,
  minimumBookingNotice,
}: {
  time: string;
  minimumBookingNotice: number;
}) {
  const log = logger.getSubLogger({ prefix: ["isTimeOutOfBounds"] });

  log.debug({
    time,
    minimumBookingNotice,
  });

  const date = dayjs(time);
  guardAgainstBookingInThePast(date.toDate());
  if (minimumBookingNotice) {
    const minimumBookingStartDate = dayjs().add(minimumBookingNotice, "minutes");
    if (date.isBefore(minimumBookingStartDate)) {
      return true;
    }
  }
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
  dateString: string;
  periodLimits: PeriodLimits;
}) {
  const log = logger.getSubLogger({ prefix: ["isDateOutOfBounds"] });

  log.debug(
    safeStringify({
      dateString,
      periodLimits: {
        rollingEndDay: periodLimits.rollingEndDay?.format("YYYY-MM-DD"),
        rangeStartDay: periodLimits.rangeStartDay?.format("YYYY-MM-DD"),
        rangeEndDay: periodLimits.rangeEndDay?.format("YYYY-MM-DD"),
      },
    })
  );

  const date = dayjs(dateString);
  if (periodLimits.rollingEndDay) {
    return date.endOf("day").isAfter(periodLimits.rollingEndDay);
  }

  if (periodLimits.rangeStartDay && periodLimits.rangeEndDay) {
    return (
      date.endOf("day").isBefore(periodLimits.rangeStartDay) ||
      date.endOf("day").isAfter(periodLimits.rangeEndDay)
    );
  }
  return false;
}
