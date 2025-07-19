import { fromZonedTime } from "date-fns-tz";

import type { DateFnsDate } from "@calcom/lib/dateFns";
import {
  addTime,
  subtractTime,
  startOf,
  endOf,
  isBefore,
  isAfter,
  isBetween,
  min,
  max,
  format,
  tz,
  valueOf,
} from "@calcom/lib/dateFns";
import type { IOutOfOfficeData } from "@calcom/lib/getUserAvailability";
import type { Availability } from "@calcom/prisma/client";

export type DateRange = {
  start: DateFnsDate;
  end: DateFnsDate;
};

export type DateOverride = Pick<Availability, "date" | "startTime" | "endTime">;
export type WorkingHours = Pick<Availability, "days" | "startTime" | "endTime">;

type TravelSchedule = {
  startDate: DateFnsDate | { toDate?: () => Date };
  endDate?: DateFnsDate | { toDate?: () => Date };
  timeZone: string;
};

function getAdjustedTimezone(date: DateFnsDate, timeZone: string, travelSchedules: TravelSchedule[]) {
  let adjustedTimezone = timeZone;

  for (const travelSchedule of travelSchedules) {
    const normalizedStartDate =
      typeof travelSchedule.startDate === "object" &&
      "toDate" in travelSchedule.startDate &&
      typeof travelSchedule.startDate.toDate === "function"
        ? travelSchedule.startDate.toDate()
        : (travelSchedule.startDate as DateFnsDate);
    const normalizedEndDate = travelSchedule.endDate
      ? typeof travelSchedule.endDate === "object" &&
        "toDate" in travelSchedule.endDate &&
        typeof travelSchedule.endDate.toDate === "function"
        ? travelSchedule.endDate.toDate()
        : (travelSchedule.endDate as DateFnsDate)
      : undefined;

    if (!isBefore(date, normalizedStartDate) && (!normalizedEndDate || !isAfter(date, normalizedEndDate))) {
      adjustedTimezone = travelSchedule.timeZone;
      break;
    }
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
  dateFrom: DateFnsDate;
  dateTo: DateFnsDate;
  travelSchedules: TravelSchedule[];
}) {
  const results = [];

  for (
    let date = startOf(dateFrom, "day");
    isBefore(date, dateTo) || date.getTime() === startOf(dateTo, "day").getTime();
    date = addTime(date, 1, "day")
  ) {
    const adjustedTimezone = getAdjustedTimezone(date, timeZone, travelSchedules);

    const dateInTz = tz(date, adjustedTimezone);

    if (!item.days.includes(dateInTz.getDay())) {
      continue;
    }

    const startTimeMinutes = item.startTime.getUTCHours() * 60 + item.startTime.getUTCMinutes();
    const endTimeMinutes = item.endTime.getUTCHours() * 60 + item.endTime.getUTCMinutes();

    const dateString = format(date, "yyyy-MM-dd");

    const startTimeInTimezone = new Date(
      `${dateString}T${Math.floor(startTimeMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(startTimeMinutes % 60).toString().padStart(2, "0")}:00`
    );
    const endTimeInTimezone = new Date(
      `${dateString}T${Math.floor(endTimeMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(endTimeMinutes % 60).toString().padStart(2, "0")}:00`
    );

    const startTimeUTC = fromZonedTime(startTimeInTimezone, adjustedTimezone);
    const endTimeUTC = fromZonedTime(endTimeInTimezone, adjustedTimezone);

    const startResult = max([startTimeUTC, dateFrom]);
    let endResult = min([endTimeUTC, dateTo]);

    // INFO: We only allow users to set availability up to 11:59PM which ends up not making them available
    // up to midnight.
    if (endResult.getHours() === 23 && endResult.getMinutes() === 59) {
      endResult = addTime(endResult, 1, "minutes");
    }

    if (isBefore(endResult, startResult)) {
      // if an event ends before start, it's not a result.
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
  itemDateAsUtc: DateFnsDate;
  timeZone: string;
  travelSchedules: TravelSchedule[];
}) {
  const overrideDate = new Date(item.date!);

  const adjustedTimezone = getAdjustedTimezone(overrideDate, timeZone, travelSchedules);

  const itemDateStartOfDay = startOf(itemDateAsUtc, "day");
  const startDate = tz(
    new Date(
      addTime(
        addTime(itemDateStartOfDay, item.startTime.getUTCHours(), "hours"),
        item.startTime.getUTCMinutes(),
        "minutes"
      ).getTime()
    ),
    adjustedTimezone
  );
  startDate.setSeconds(0);

  let endDate = itemDateStartOfDay;
  const endTimeHours = item.endTime.getUTCHours();
  const endTimeMinutes = item.endTime.getUTCMinutes();

  if (endTimeHours === 23 && endTimeMinutes === 59) {
    endDate = tz(addTime(endDate, 1, "days"), timeZone);
  } else {
    endDate = tz(
      new Date(
        addTime(addTime(itemDateStartOfDay, endTimeHours, "hours"), endTimeMinutes, "minutes").getTime()
      ),
      adjustedTimezone
    );
    endDate.setSeconds(0);
  }

  return {
    start: startDate,
    end: endDate,
  };
}

// This function processes out-of-office dates and returns a date range for each OOO date.
function processOOO(outOfOffice: DateFnsDate, timeZone: string) {
  const OOOdate = tz(outOfOffice, timeZone);
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
  dateFrom: DateFnsDate | { toDate?: () => Date };
  dateTo: DateFnsDate | { toDate?: () => Date };
  travelSchedules: TravelSchedule[];
  outOfOffice?: IOutOfOfficeData;
}): { dateRanges: DateRange[]; oooExcludedDateRanges: DateRange[] } {
  const normalizedDateFrom =
    typeof dateFrom === "object" && "toDate" in dateFrom && typeof dateFrom.toDate === "function"
      ? dateFrom.toDate()
      : (dateFrom as DateFnsDate);
  const normalizedDateTo =
    typeof dateTo === "object" && "toDate" in dateTo && typeof dateTo.toDate === "function"
      ? dateTo.toDate()
      : (dateTo as DateFnsDate);

  const groupedWorkingHours = groupByDate(
    availability.reduce((processed: DateRange[], item) => {
      if ("days" in item) {
        const result = processWorkingHours({
          item,
          timeZone,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          travelSchedules,
        });
        processed = processed.concat(result);
      }
      return processed;
    }, [])
  );
  const OOOdates = outOfOffice
    ? Object.keys(outOfOffice).map((outOfOffice) =>
        processOOO(new Date(`${outOfOffice}T00:00:00.000Z`), timeZone)
      )
    : [];

  const groupedOOO = groupByDate(OOOdates);

  const groupedDateOverrides = groupByDate(
    availability.reduce((processed: DateRange[], item) => {
      if ("date" in item && !!item.date) {
        let itemDateAsUtc: Date;
        if (typeof item.date === "string") {
          itemDateAsUtc = new Date(item.date);
        } else if (item.date instanceof Date) {
          itemDateAsUtc = new Date(item.date.toISOString());
        } else if (
          typeof item.date === "object" &&
          "toISOString" in item.date &&
          typeof item.date.toISOString === "function"
        ) {
          itemDateAsUtc = new Date(item.date.toISOString());
        } else if (
          typeof item.date === "object" &&
          "toDate" in item.date &&
          typeof item.date.toDate === "function"
        ) {
          itemDateAsUtc = new Date(item.date.toDate());
        } else {
          itemDateAsUtc = new Date(item.date as any);
        }
        // TODO: Remove the .subtract(1, "day") and .add(1, "day") part and
        // refactor this to actually work with correct dates.
        // As of 2024-02-20, there are mismatches between local and UTC dates for overrides
        // and the dateFrom and dateTo fields, resulting in this if not returning true, which
        // results in "no available users found" errors.
        if (
          isBetween(
            itemDateAsUtc,
            startOf(subtractTime(normalizedDateFrom, 1, "days"), "day"),
            endOf(addTime(normalizedDateTo, 1, "days"), "day"),
            "[]"
          )
        ) {
          processed.push(processDateOverride({ item, itemDateAsUtc, timeZone, travelSchedules }));
        }
      }
      return processed;
    }, [])
  );

  const dateRanges = Object.values({
    ...groupedWorkingHours,
    ...groupedDateOverrides,
  }).map(
    // remove 0-length overrides that were kept to cancel out working dates until now.
    (ranges) => ranges.filter((range) => valueOf(range.start) !== valueOf(range.end))
  );

  const oooExcludedDateRanges = Object.values({
    ...groupedWorkingHours,
    ...groupedDateOverrides,
    ...groupedOOO,
  }).map(
    // remove 0-length overrides && OOO dates that were kept to cancel out working dates until now.
    (ranges) => ranges.filter((range) => valueOf(range.start) !== valueOf(range.end))
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

  // Pre-sort all user ranges and cache timestamp values.
  const sortedRanges: ProcessedDateRange[][] = ranges.map((userRanges) =>
    userRanges
      .map((r) => ({
        ...r,
        startValue: valueOf(r.start),
        endValue: valueOf(r.end),
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
  const sortedExcludedRanges = [...excludedRanges].sort((a, b) => valueOf(a.start) - valueOf(b.start));

  for (const { start: sourceStart, end: sourceEnd, ...passThrough } of sourceRanges) {
    let currentStart = sourceStart;

    for (const excludedRange of sortedExcludedRanges) {
      if (valueOf(excludedRange.start) >= valueOf(sourceEnd)) break;
      if (valueOf(excludedRange.end) <= valueOf(currentStart)) continue;

      if (valueOf(excludedRange.start) > valueOf(currentStart)) {
        result.push({ start: currentStart, end: excludedRange.start, ...passThrough });
      }

      if (valueOf(excludedRange.end) > valueOf(currentStart)) {
        currentStart = excludedRange.end;
      }
    }

    if (valueOf(sourceEnd) > valueOf(currentStart)) {
      result.push({ start: currentStart, end: sourceEnd, ...passThrough });
    }
  }

  return result;
}

export function mergeOverlappingRanges(ranges: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
  if (ranges.length === 0) return [];

  const sortedRanges = ranges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const mergedRanges: { start: Date; end: Date }[] = [sortedRanges[0]];

  for (let i = 1; i < sortedRanges.length; i++) {
    const lastMergedRange = mergedRanges[mergedRanges.length - 1];
    const currentRange = sortedRanges[i];

    if (currentRange.start.getTime() <= lastMergedRange.end.getTime()) {
      lastMergedRange.end = new Date(Math.max(lastMergedRange.end.getTime(), currentRange.end.getTime()));
    } else {
      mergedRanges.push(currentRange);
    }
  }
  return mergedRanges;
}
