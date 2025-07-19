import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { IOutOfOfficeData } from "@calcom/lib/getUserAvailability";
import type { Availability } from "@calcom/prisma/client";

type TimezonedDate = {
  date: Date;
  timeZone: string;
};

type TimezonedDateRange = {
  start: TimezonedDate;
  end: TimezonedDate;
};

export type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

export type DateOverride = Pick<Availability, "date" | "startTime" | "endTime">;
export type WorkingHours = Pick<Availability, "days" | "startTime" | "endTime">;

type TravelSchedule = { startDate: Dayjs; endDate?: Dayjs; timeZone: string };

function getTravelScheduleActiveOnDate(
  date: Date,
  travelSchedules: TravelSchedule[],
  travelScheduleDefault: TravelSchedule
): TravelSchedule {
  const targetTs = date.getTime();
  let low = 0;
  let high = travelSchedules.length - 1;
  let result: TravelSchedule = travelScheduleDefault;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { startDate, endDate } = travelSchedules[mid];

    if (startDate.valueOf() <= targetTs) {
      if (!endDate || targetTs <= endDate.valueOf()) {
        result = travelSchedules[mid];
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

function getResultsWithAppliedTravelSchedules({
  startResult,
  endResult,
  travelSchedules,
  travelScheduleDefault,
}: {
  startResult: Dayjs;
  endResult: Dayjs;
  travelSchedules: TravelSchedule[];
  travelScheduleDefault: TravelSchedule;
}) {
  const results = [];
  let activeTravelScheduleOnStartDate = getTravelScheduleActiveOnDate(
    startResult.toDate(),
    travelSchedules,
    travelScheduleDefault
  );

  while (
    activeTravelScheduleOnStartDate.endDate &&
    activeTravelScheduleOnStartDate.endDate.valueOf() <= endResult.valueOf()
  ) {
    results.push({
      start: {
        date: startResult.toDate(),
        timeZone: activeTravelScheduleOnStartDate.timeZone,
      },
      end: {
        date: activeTravelScheduleOnStartDate.endDate.toDate(),
        timeZone: activeTravelScheduleOnStartDate.timeZone,
      },
    });
    startResult = activeTravelScheduleOnStartDate.endDate;
    activeTravelScheduleOnStartDate = getTravelScheduleActiveOnDate(
      new Date(startResult.valueOf() + 1),
      travelSchedules,
      travelScheduleDefault
    );
  }
  // the only required result push, which is the final result.
  results.push({
    start: {
      date: startResult.toDate(),
      timeZone: activeTravelScheduleOnStartDate.timeZone,
    },
    end: {
      // end result is ALWAYS the final result
      date: endResult.toDate(),
      timeZone: activeTravelScheduleOnStartDate.timeZone,
    },
  });
  return results;
}

export function processWorkingHours({
  item,
  travelSchedules = [],
  travelScheduleDefault,
  dateFrom,
  dateTo,
}: {
  item: WorkingHours;
  travelSchedules?: TravelSchedule[];
  travelScheduleDefault: TravelSchedule;
  dateFrom: Dayjs;
  dateTo: Dayjs;
}) {
  const results = [];
  const endTs = dateTo.valueOf();

  let isFirstDay = true;

  for (let date = dateFrom.startOf("day"); date.valueOf() <= endTs; date = date.add(1, "day")) {
    // skip: if the date is not in the working hours days.
    if (!item.days.includes(date.day())) continue;

    // performance matters here, .add is 2x more performant than .hour + .minute
    const dayStartResult = date.add(
      item.startTime.getUTCHours() * 60 + item.startTime.getUTCMinutes(),
      "minutes"
    );
    const dayEndResult = date.add(item.endTime.getUTCHours() * 60 + item.endTime.getUTCMinutes(), "minutes");

    let startResult: Dayjs;
    if (isFirstDay) {
      startResult = dayjs.max(dayStartResult, dateFrom);
      isFirstDay = false;
    } else {
      startResult = dayStartResult;
    }
    let endResult = dayjs.min(dayEndResult, dateTo);
    // INFO: We only allow users to set availability up to 11:59PM which ends up not making them available
    // up to midnight.
    if (endResult.hour() === 23 && endResult.minute() === 59) {
      endResult = endResult.add(1, "minute");
    }

    if (endResult.valueOf() < startResult.valueOf()) {
      // if an event ends before start, it's not a result.
      continue;
    }

    results.push(
      ...getResultsWithAppliedTravelSchedules({
        startResult,
        endResult,
        travelSchedules,
        travelScheduleDefault,
      })
    );
  }

  return results;
}

export function processDateOverride({
  item,
  itemDateAsUtc,
  travelSchedules = [],
  travelScheduleDefault,
}: {
  item: DateOverride;
  itemDateAsUtc: Dayjs;
  travelSchedules?: TravelSchedule[];
  travelScheduleDefault: TravelSchedule;
}) {
  const itemDateStartOfDay = itemDateAsUtc.startOf("day");
  const startDate = itemDateStartOfDay
    .add(item.startTime.getUTCHours(), "hours")
    .add(item.startTime.getUTCMinutes(), "minutes")
    .second(0);

  let endDate = itemDateStartOfDay;
  const endTimeHours = item.endTime.getUTCHours();
  const endTimeMinutes = item.endTime.getUTCMinutes();

  if (endTimeHours === 23 && endTimeMinutes === 59) {
    endDate = endDate.add(1, "day");
  } else {
    endDate = itemDateStartOfDay.add(endTimeHours, "hours").add(endTimeMinutes, "minutes").second(0);
  }

  return getResultsWithAppliedTravelSchedules({
    startResult: startDate,
    endResult: endDate,
    travelSchedules,
    travelScheduleDefault,
  });
}

// This function processes out-of-office dates and returns a date range for each OOO date.
function processOOO(outOfOffice: Date, timeZone: string) {
  // for now.
  return {
    start: {
      date: outOfOffice,
      timeZone,
    },
    end: {
      date: outOfOffice,
      timeZone,
    },
  };
}

/**
 * Will convert all availability data into date ranges, taking account the time zone of the organizer,
 * the date range of the attendee, travel schedules, and out-of-office data.
 *
 * A date range is defined as a start and end Date object, both of which are in UTC.
 */
export function buildDateRanges({
  availability,
  timeZone /* Organizer timeZone */,
  dateFrom /* Attendee dateFrom */,
  dateTo /* `` dateTo */,
  travelSchedules = [],
  outOfOffice,
}: {
  timeZone: string;
  availability: (DateOverride | WorkingHours)[];
  dateFrom: Dayjs;
  dateTo: Dayjs;
  travelSchedules: TravelSchedule[];
  outOfOffice?: IOutOfOfficeData;
}): { dateRanges: DateRange[]; oooExcludedDateRanges: DateRange[] } {
  // set default to provided timeZone with dateFrom (earliest possible date)
  const travelScheduleDefault: TravelSchedule = {
    startDate: dateFrom,
    timeZone,
  };

  travelSchedules.sort((a, b) => a.startDate.valueOf() - b.startDate.valueOf());

  const groupedWorkingHours = groupByDate(
    availability.reduce((processed: TimezonedDateRange[], item) => {
      if ("days" in item) {
        processed.push(
          ...processWorkingHours({ item, dateFrom, dateTo, travelSchedules, travelScheduleDefault })
        );
      }
      return processed;
    }, [])
  );

  const OOOdates = outOfOffice
    ? Object.keys(outOfOffice).map((outOfOffice) => processOOO(new Date(outOfOffice), timeZone))
    : [];

  const groupedOOO = groupByDate(OOOdates);

  const groupedDateOverrides = groupByDate(
    availability.reduce((processed: TimezonedDateRange[], item) => {
      if ("date" in item && !!item.date) {
        const itemDateAsUtc = dayjs.utc(item.date);
        // TODO: Remove the .subtract(1, "day") and .add(1, "day") part and
        // refactor this to actually work with correct dates.
        // As of 2024-02-20, there are mismatches between local and UTC dates for overrides
        // and the dateFrom and dateTo fields, resulting in this if not returning true, which
        // results in "no available users found" errors.
        if (
          itemDateAsUtc.isBetween(
            dateFrom.subtract(1, "day").startOf("day"),
            dateTo.add(1, "day").endOf("day"),
            null,
            "[]"
          )
        ) {
          processed.push(
            ...processDateOverride({ item, itemDateAsUtc, travelSchedules, travelScheduleDefault })
          );
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
    (ranges) => ranges.filter((range) => range.start.date.valueOf() !== range.end.date.valueOf())
  );

  const oooExcludedDateRanges = Object.values({
    ...groupedWorkingHours,
    ...groupedDateOverrides,
    ...groupedOOO,
  }).map(
    // remove 0-length overrides && OOO dates that were kept to cancel out working dates until now.
    (ranges) => ranges.filter((range) => range.start.date.valueOf() !== range.end.date.valueOf())
  );

  const result = {
    dateRanges: dateRanges.flat().map((range) => ({
      start: dayjs.utc(range.start.date).tz(range.start.timeZone, true),
      end: dayjs.utc(range.end.date).tz(range.end.timeZone, true),
    })),
    oooExcludedDateRanges: oooExcludedDateRanges.flat().map((range) => ({
      start: dayjs.utc(range.start.date).tz(range.start.timeZone, true),
      end: dayjs.utc(range.end.date).tz(range.end.timeZone, true),
    })),
  };

  return result;
}

export function groupByDate(ranges: TimezonedDateRange[]): { [x: string]: TimezonedDateRange[] } {
  const results = ranges.reduce(
    (
      previousValue: {
        [date: string]: TimezonedDateRange[];
      },
      currentValue
    ) => {
      const dateString = dayjs(currentValue.start.date).format("YYYY-MM-DD");

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
        startValue: r.start.valueOf(),
        endValue: r.end.valueOf(),
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
  const sortedExcludedRanges = [...excludedRanges].sort((a, b) => a.start.valueOf() - b.start.valueOf());

  for (const { start: sourceStart, end: sourceEnd, ...passThrough } of sourceRanges) {
    let currentStart = sourceStart;

    for (const excludedRange of sortedExcludedRanges) {
      if (excludedRange.start.valueOf() >= sourceEnd.valueOf()) break;
      if (excludedRange.end.valueOf() <= currentStart.valueOf()) continue;

      if (excludedRange.start.valueOf() > currentStart.valueOf()) {
        result.push({ start: currentStart, end: excludedRange.start, ...passThrough });
      }

      if (excludedRange.end.valueOf() > currentStart.valueOf()) {
        currentStart = excludedRange.end;
      }
    }

    if (sourceEnd.valueOf() > currentStart.valueOf()) {
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
