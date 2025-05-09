import type { EventType } from "@prisma/client";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import { getUTCOffsetByTimezone } from "./dayjs";
import { calculatePeriodLimits } from "./isOutOfBounds";

export type DateTimeRangeTransformOptions = {
  eventType: Pick<
    EventType,
    | "periodType"
    | "periodDays"
    | "periodCountCalendarDays"
    | "periodStartDate"
    | "periodEndDate"
    | "minimumBookingNotice"
  > & {
    schedule: {
      timeZone: string;
    };
  };
  timeZone: string;
};

export type DateTimeRangeSuccess = {
  success: true;
  start: Dayjs;
  end: Dayjs;
};

export type DateTimeRangeFailure = {
  success: false;
  field: string;
  message: string;
};

const getStartTime = (startTimeInput: string, timeZone?: string, minimumBookingNotice?: number) => {
  const startTimeMin = dayjs.utc().add(minimumBookingNotice || 1, "minutes");
  const startTime = timeZone === "Etc/GMT" ? dayjs.utc(startTimeInput) : dayjs(startTimeInput).tz(timeZone);

  return startTimeMin.isAfter(startTime) ? startTimeMin.tz(timeZone) : startTime;
};

const transformDateTimeRange = (
  startTime: string,
  endTime: string,
  { eventType, timeZone }: DateTimeRangeTransformOptions
): DateTimeRangeSuccess | DateTimeRangeFailure => {
  const isRollingWindowPeriodType = eventType.periodType === PeriodType.ROLLING_WINDOW;
  const isStartTimeInPast = dayjs(startTime).isBefore(dayjs().subtract(1, "day").startOf("day"));
  // If startTime is already sent in the past, we don't need to adjust it.
  // We assume that the client is already sending startTime as per their requirement.
  // Note: We could optimize it further to go back 1 month in past only for the 2nd month because that is what we are putting a hard limit at.
  const startTimeAdjustedForRollingWindowComputation =
    isStartTimeInPast || !isRollingWindowPeriodType
      ? startTime
      : dayjs(startTime).subtract(1, "month").toISOString();

  const startTimeResult = getStartTime(
    startTimeAdjustedForRollingWindowComputation,
    timeZone,
    eventType.minimumBookingNotice
  );

  let endTimeResult = timeZone === "Etc/GMT" ? dayjs.utc(endTime) : dayjs(endTime).utc().tz(timeZone);

  const eventUtcOffset = getUTCOffsetByTimezone(eventType.schedule.timeZone) ?? 0;
  const bookerUtcOffset = timeZone ? getUTCOffsetByTimezone(timeZone) ?? 0 : 0;
  const periodLimits = calculatePeriodLimits({
    periodType: eventType.periodType,
    periodDays: eventType.periodDays,
    periodCountCalendarDays: eventType.periodCountCalendarDays,
    periodStartDate: eventType.periodStartDate,
    periodEndDate: eventType.periodEndDate,
    // only necessary for rolling window check which this transformer does not support.
    allDatesWithBookabilityStatusInBookerTz: {},
    _skipRollingWindowCheck: true,
    eventUtcOffset,
    bookerUtcOffset,
  });

  if (periodLimits.endOfRollingPeriodEndDayInBookerTz) {
    const isAfterRollingEndDay =
      endTimeResult.valueOf() > periodLimits.endOfRollingPeriodEndDayInBookerTz.valueOf();
    if (isAfterRollingEndDay) {
      endTimeResult = periodLimits.endOfRollingPeriodEndDayInBookerTz.add(14, "hours");
    }
  }

  /*if (periodLimits.startOfRangeStartDayInEventTz) {
    const isBeforeStartOfRange =
      endTimeResult.valueOf() < periodLimits.startOfRangeStartDayInEventTz.valueOf();
    if (isBeforeStartOfRange) {
      startTimeResult = periodLimits.startOfRangeStartDayInEventTz;
    }
  }

  if (periodLimits.endOfRangeEndDayInEventTz) {
    const isAfterEndOfRange = endTimeResult.valueOf() > periodLimits.endOfRangeEndDayInEventTz.valueOf();
    if (isAfterEndOfRange) {
      endTimeResult = periodLimits.endOfRangeEndDayInEventTz;
    }
  }*/

  return {
    success: true,
    start: startTimeResult,
    end: endTimeResult,
  };
};

export { getStartTime, transformDateTimeRange };
