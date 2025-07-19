import {
  addMinutes,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  format,
  max,
  min,
  getDay,
} from "date-fns";
import { fromZonedTime, toZonedTime, getTimezoneOffset } from "date-fns-tz";

import type { IOutOfOfficeData } from "@calcom/lib/getUserAvailability";
import type { Availability } from "@calcom/prisma/client";

export type DateRange = {
  start: Date;
  end: Date;
};

export type DateOverride = Pick<Availability, "date" | "startTime" | "endTime">;
export type WorkingHours = Pick<Availability, "days" | "startTime" | "endTime">;

type TravelSchedule = { startDate: Date; endDate?: Date; timeZone: string };

function dateToUtc(date: Date, timeZone: string): Date {
  return fromZonedTime(date, timeZone);
}

function utcToZonedDate(date: Date, timeZone: string): Date {
  return toZonedTime(date, timeZone);
}

function getOffsetInMinutes(date: Date, timeZone: string): number {
  return getTimezoneOffset(timeZone, date) / (1000 * 60);
}

function getAdjustedTimezone(date: Date, timeZone: string, travelSchedules: TravelSchedule[]) {
  let adjustedTimezone = timeZone;

  for (const travelSchedule of travelSchedules) {
    if (
      !isBefore(date, travelSchedule.startDate) &&
      (!travelSchedule.endDate || !isAfter(date, travelSchedule.endDate))
    ) {
      adjustedTimezone = travelSchedule.timeZone;
      break;
    }
  }

  try {
    getTimezoneOffset(adjustedTimezone, date);
  } catch (error) {
    adjustedTimezone = timeZone;
  }

  return adjustedTimezone;
}

export function processWorkingHours({
  item,
  timeZone,
  dateFrom,
  dateTo,
  travelSchedules,
}: {
  item: WorkingHours;
  timeZone: string;
  dateFrom: Date;
  dateTo: Date;
  travelSchedules: TravelSchedule[];
}) {
  const results = [];

  for (let date = startOfDay(dateFrom); isBefore(date, dateTo); date = addDays(date, 1)) {
    const adjustedTimezone = getAdjustedTimezone(date, timeZone, travelSchedules);

    const dayOfWeek = getDay(date);

    if (!item.days.includes(dayOfWeek)) {
      continue;
    }

    const startTimeHours = item.startTime.getUTCHours();
    const startTimeMinutes = item.startTime.getUTCMinutes();
    const endTimeHours = item.endTime.getUTCHours();
    const endTimeMinutes = item.endTime.getUTCMinutes();

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const startTimeLocal = new Date(year, month, day, startTimeHours, startTimeMinutes);
    const endTimeLocal = new Date(year, month, day, endTimeHours, endTimeMinutes);

    const start = fromZonedTime(startTimeLocal, adjustedTimezone);
    const end = fromZonedTime(endTimeLocal, adjustedTimezone);

    const startResult = max([start, dateFrom]);
    let endResult = min([end, dateTo]);

    // INFO: We only allow users to set availability up to 11:59PM which ends up not making them available
    // up to midnight.
    const endInTz = utcToZonedDate(endResult, adjustedTimezone);
    if (endInTz.getHours() === 23 && endInTz.getMinutes() === 59) {
      endResult = addMinutes(endResult, 1);
    }

    if (isBefore(endResult, startResult)) {
      continue;
    }
    results.push({
      start: startResult,
      end: endResult,
    });
  }
  return results;
}

export function processDateOverride({
  item,
  itemDateAsUtc,
  timeZone,
  travelSchedules,
}: {
  item: DateOverride;
  itemDateAsUtc: Date;
  timeZone: string;
  travelSchedules: TravelSchedule[];
}) {
  const overrideDate = new Date(item.date!);
  const adjustedTimezone = getAdjustedTimezone(overrideDate, timeZone, travelSchedules);

  const year = overrideDate.getUTCFullYear();
  const month = overrideDate.getUTCMonth();
  const day = overrideDate.getUTCDate();

  const startTimeHours = item.startTime.getUTCHours();
  const startTimeMinutes = item.startTime.getUTCMinutes();
  const endTimeHours = item.endTime.getUTCHours();
  const endTimeMinutes = item.endTime.getUTCMinutes();

  const startTimeLocal = new Date(year, month, day, startTimeHours, startTimeMinutes);
  const startDate = fromZonedTime(startTimeLocal, adjustedTimezone);

  let endDate: Date;
  if (startTimeHours === 0 && startTimeMinutes === 0 && endTimeHours === 0 && endTimeMinutes === 0) {
    endDate = startDate;
  } else if (endTimeHours === 23 && endTimeMinutes === 59) {
    const endTimeLocal = new Date(year, month, day + 1, 0, 0);
    endDate = fromZonedTime(endTimeLocal, adjustedTimezone);
  } else {
    const endTimeLocal = new Date(year, month, day, endTimeHours, endTimeMinutes);
    endDate = fromZonedTime(endTimeLocal, adjustedTimezone);
  }

  return {
    start: startDate,
    end: endDate,
  };
}

// This function processes out-of-office dates and returns a date range for each OOO date.
function processOOO(outOfOffice: Date, timeZone: string) {
  const OOOdate = utcToZonedDate(outOfOffice, timeZone);
  return {
    start: OOOdate,
    end: OOOdate,
  };
}

export function buildDateRanges({
  availability,
  timeZone /* Organizer timeZone */,
  dateFrom /* Attendee dateFrom */,
  dateTo /* `` dateTo */,
  travelSchedules,
  outOfOffice,
}: {
  timeZone: string;
  availability: (DateOverride | WorkingHours)[];
  dateFrom: Date;
  dateTo: Date;
  travelSchedules: TravelSchedule[];
  outOfOffice?: IOutOfOfficeData;
}): { dateRanges: DateRange[]; oooExcludedDateRanges: DateRange[] } {
  const groupedWorkingHours = groupByDate(
    availability.reduce((processed: DateRange[], item) => {
      if ("days" in item) {
        processed = processed.concat(
          processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules })
        );
      }
      return processed;
    }, [])
  );
  const OOOdates = outOfOffice
    ? Object.keys(outOfOffice).map((outOfOfficeKey) => processOOO(new Date(outOfOfficeKey), timeZone))
    : [];

  const groupedOOO = groupByDate(OOOdates);

  const groupedDateOverrides = groupByDate(
    availability.reduce((processed: DateRange[], item) => {
      if ("date" in item && item.date) {
        const itemDateAsUtc = new Date(item.date);
        // TODO: Remove the .subtract(1, "day") and .add(1, "day") part and
        // refactor this to actually work with correct dates.
        // As of 2024-02-20, there are mismatches between local and UTC dates for overrides
        // and the dateFrom and dateTo fields, resulting in this if not returning true, which
        // results in "no available users found" errors.
        const dateFromAdjusted = startOfDay(subDays(dateFrom, 1));
        const dateToAdjusted = endOfDay(addDays(dateTo, 1));

        const inRange = !isBefore(itemDateAsUtc, dateFromAdjusted) && !isAfter(itemDateAsUtc, dateToAdjusted);

        if (inRange) {
          const result = processDateOverride({ item, itemDateAsUtc, timeZone, travelSchedules });
          processed.push(result);
        }
      }
      return processed;
    }, [])
  );

  const workingHoursRanges = Object.values(groupedWorkingHours).flat();
  const dateOverrideRanges = Object.values(groupedDateOverrides).flat();

  const overrideDates = new Set(
    availability
      .filter((item): item is DateOverride => "date" in item && item.date !== null)
      .map((item) => format(new Date(item.date!), "yyyy-MM-dd"))
  );

  // Filter out working hours for dates that have overrides
  const filteredWorkingHours = workingHoursRanges.filter(
    (range) => !overrideDates.has(format(range.start, "yyyy-MM-dd"))
  );

  const allRanges = [...dateOverrideRanges, ...filteredWorkingHours].filter(
    (range) => range.start.getTime() !== range.end.getTime()
  );

  const dateRanges = Object.values(groupByDate(allRanges)).map(
    // remove 0-length overrides that were kept to cancel out working dates until now.
    (ranges) => ranges.filter((range) => range.start.getTime() !== range.end.getTime())
  );

  const oooDates = new Set(outOfOffice ? Object.keys(outOfOffice) : []);

  // Filter out ranges that fall on OOO dates
  const filteredDateOverrides = dateOverrideRanges.filter(
    (range) => !oooDates.has(format(range.start, "yyyy-MM-dd"))
  );

  const filteredWorkingHoursForOOO = filteredWorkingHours.filter(
    (range) => !oooDates.has(format(range.start, "yyyy-MM-dd"))
  );

  const allRangesWithOOO = [...filteredDateOverrides, ...filteredWorkingHoursForOOO].filter(
    (range) => range.start.getTime() !== range.end.getTime()
  );

  const oooExcludedDateRanges = Object.values(groupByDate(allRangesWithOOO)).map(
    // remove 0-length overrides that were kept to cancel out working dates until now.
    (ranges) => ranges.filter((range) => range.start.getTime() !== range.end.getTime())
  );

  return { dateRanges: dateRanges.flat(), oooExcludedDateRanges: oooExcludedDateRanges.flat() };
}

export function groupByDate(ranges: DateRange[]): { [x: string]: DateRange[] } {
  const results = ranges.reduce(
    (
      previousValue: {
        [date: string]: DateRange[];
      },
      currentValue
    ) => {
      const dateString = format(currentValue.start, "yyyy-MM-dd");

      previousValue[dateString] =
        typeof previousValue[dateString] === "undefined"
          ? [currentValue]
          : [...previousValue[dateString], currentValue];
      return previousValue;
    },
    {}
  );

  return results;
}

export function intersect(ranges: DateRange[][]): DateRange[] {
  if (!ranges.length) {
    return [];
  }

  type ProcessedDateRange = DateRange & { startValue: number; endValue: number };

  // Pre-sort all user ranges and cache timestamp values for performance.
  const sortedRanges: ProcessedDateRange[][] = ranges.map((userRanges) =>
    userRanges
      .map((r) => ({
        ...r,
        startValue: r.start.getTime(),
        endValue: r.end.getTime(),
      }))
      .sort((a, b) => a.startValue - b.startValue)
  );

  let commonAvailability: ProcessedDateRange[] = sortedRanges[0];

  for (let i = 1; i < sortedRanges.length; i++) {
    // Early exit if no common availability is left.
    if (commonAvailability.length === 0) {
      return [];
    }

    const userRanges = sortedRanges[i];
    const intersectedRanges: ProcessedDateRange[] = [];

    let commonIndex = 0;
    let userIndex = 0;

    while (commonIndex < commonAvailability.length && userIndex < userRanges.length) {
      const commonRange = commonAvailability[commonIndex];
      const userRange = userRanges[userIndex];

      const intersectStartValue = Math.max(commonRange.startValue, userRange.startValue);
      const intersectEndValue = Math.min(commonRange.endValue, userRange.endValue);

      if (intersectStartValue < intersectEndValue) {
        const intersectStart =
          commonRange.startValue > userRange.startValue ? commonRange.start : userRange.start;
        const intersectEnd = commonRange.endValue < userRange.endValue ? commonRange.end : userRange.end;
        intersectedRanges.push({
          start: intersectStart,
          end: intersectEnd,
          startValue: intersectStartValue,
          endValue: intersectEndValue,
        });
      }

      if (commonRange.endValue <= userRange.endValue) {
        commonIndex++;
      } else {
        userIndex++;
      }
    }
    commonAvailability = intersectedRanges;
  }

  // Strip the cached values before returning to match the expected DateRange[] type.
  return commonAvailability.map(({ start, end }) => ({ start, end }));
}

export function subtract(
  sourceRanges: (DateRange & { [x: string]: unknown })[],
  excludedRanges: DateRange[]
) {
  const result = [];
  const sortedExcludedRanges = [...excludedRanges].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const { start: sourceStart, end: sourceEnd, ...passThrough } of sourceRanges) {
    let currentStart = sourceStart;

    for (const excludedRange of sortedExcludedRanges) {
      if (excludedRange.start.getTime() >= sourceEnd.getTime()) break;
      if (excludedRange.end.getTime() <= currentStart.getTime()) continue;

      if (excludedRange.start.getTime() > currentStart.getTime()) {
        result.push({ start: currentStart, end: excludedRange.start, ...passThrough });
      }

      if (excludedRange.end.getTime() > currentStart.getTime()) {
        currentStart = excludedRange.end;
      }
    }

    if (sourceEnd.getTime() > currentStart.getTime()) {
      result.push({ start: currentStart, end: sourceEnd, ...passThrough });
    }
  }

  return result;
}

export function mergeOverlappingRanges<T extends { start: Date; end: Date }>(ranges: T[]): T[] {
  if (ranges.length === 0) return [];

  const sortedRanges = ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

  const mergedRanges: T[] = [sortedRanges[0]];

  for (let i = 1; i < sortedRanges.length; i++) {
    const lastMergedRange = mergedRanges[mergedRanges.length - 1];
    const currentRange = sortedRanges[i];

    const currentStartTime = currentRange.start.getTime();
    const lastEndTime = lastMergedRange.end.getTime();
    const currentEndTime = currentRange.end.getTime();

    if (currentStartTime <= lastEndTime) {
      lastMergedRange.end = currentEndTime > lastEndTime ? currentRange.end : lastMergedRange.end;
    } else {
      mergedRanges.push(currentRange);
    }
  }
  return mergedRanges;
}
