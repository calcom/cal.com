import { DateTime as LuxonDateTime } from "luxon";

import type { Dayjs } from "@calcom/dayjs";
import type { Availability } from "@calcom/prisma/client";

export type DateRange = {
  start: LuxonDateTime;
  end: LuxonDateTime;
};

export type DateOverride = Pick<Availability, "date" | "startTime" | "endTime">;
export type WorkingHours = Pick<Availability, "days" | "startTime" | "endTime">;

export function processWorkingHours({
  item,
  timeZone,
  dateFrom,
  dateTo,
}: {
  item: WorkingHours;
  timeZone: string;
  dateFrom: Dayjs;
  dateTo: Dayjs;
}) {
  const utcDateTo = LuxonDateTime.fromISO(dateTo.toDate().toISOString()).toUTC();
  const dateFromAsLuxon = LuxonDateTime.fromISO(dateFrom.toISOString());
  const dateToAsLuxon = LuxonDateTime.fromISO(dateTo.toISOString());
  const results = [];

  for (let date = dateFromAsLuxon.startOf("day"); utcDateTo > date; date = date.plus({ days: 1 })) {
    const fromOffset = dateFromAsLuxon.startOf("day").offset;
    const offset = date.setZone(timeZone).offset;

    // it always has to be start of the day (midnight) even when DST changes
    const dateInTz = date.plus({ minutes: fromOffset - offset }).setZone(timeZone);
    const weekday = dateInTz.weekday === 7 ? 0 : dateInTz.weekday; // TODO: Put this in a helper somewhere
    if (!item.days.includes(weekday)) {
      continue;
    }

    let start = dateInTz.plus({
      hours: item.startTime.getUTCHours(),
      minutes: item.startTime.getUTCMinutes(),
    });

    let end = dateInTz.plus({ hours: item.endTime.getUTCHours(), minutes: item.endTime.getUTCMinutes() });

    const offsetBeginningOfDay = LuxonDateTime.fromISO(
      start.toString("YYYY-MM-DD hh:mm"),
      "YYYY-MM-DD hh:mm"
    ).setZone(timeZone).offset;

    const offsetDiff = start.offset - offsetBeginningOfDay; // there will be 60 min offset on the day day of DST change
    start = start.plus({ minutes: offsetDiff });
    end = end.plus({ minutes: offsetDiff });

    const startResult = LuxonDateTime.max(start, dateFromAsLuxon);
    const endResult = LuxonDateTime.min(end, dateToAsLuxon.setZone(timeZone));

    if (endResult < startResult) {
      continue;
    }

    results.push({
      start: startResult,
      end: endResult,
    });
  }
  return results;
}

export function processDateOverride({ item, timeZone }: { item: DateOverride; timeZone: string }) {
  const initialDate = LuxonDateTime.fromFormat(item.date, "yyyy-MM-dd").startOf("day").setZone(timeZone);
  const newDate = LuxonDateTime.fromObject(
    {
      year: initialDate.year,
      month: initialDate.month,
      day: initialDate.day,
      hour: initialDate.hour,
      minute: initialDate.minute,
      second: 0,
    },
    { zone: timeZone }
  );

  const startDate = newDate.plus({
    hours: item.startTime.getUTCHours(),
    minutes: item.startTime.getUTCMinutes(),
  });

  const endDate = newDate.plus({
    hours: item.endTime.getUTCHours(),
    minutes: item.endTime.getUTCMinutes(),
  });

  return {
    start: LuxonDateTime.fromISO(startDate.toISOString()).setZone(timeZone),
    end: LuxonDateTime.fromISO(endDate.toISOString()).setZone(timeZone),
  };
}

export function buildDateRanges({
  availability,
  timeZone /* Organizer timeZone */,
  dateFrom /* Attendee dateFrom */,
  dateTo /* `` dateTo */,
}: {
  timeZone: string;
  availability: (DateOverride | WorkingHours)[];
  dateFrom: Dayjs;
  dateTo: Dayjs;
}): DateRange[] {
  const dateFromOrganizerTZ = dateFrom.tz(timeZone);
  const start = performance.now();
  const groupedWorkingHours = groupByDate(
    availability.reduce((processed: DateRange[], item) => {
      if ("days" in item) {
        processed = processed.concat(
          processWorkingHours({ item, timeZone, dateFrom: dateFromOrganizerTZ, dateTo })
        );
      }
      return processed;
    }, [])
  );

  const end = performance.now();
  //console.log("groupedWorkingHours", `${end - start}ms`, availability.length);
  const groupedDateOverrides = groupByDate(
    availability.reduce((processed: DateRange[], item) => {
      if ("date" in item && !!item.date) {
        processed.push(processDateOverride({ item, timeZone }));
      }
      return processed;
    }, [])
  );

  const dateRanges = Object.values({
    ...groupedWorkingHours,
    ...groupedDateOverrides,
  }).map(
    // remove 0-length overrides that were kept to cancel out working dates until now.
    (ranges) => ranges.filter((range) => range.start.valueOf() !== range.end.valueOf())
  );

  return dateRanges.flat();
}

export function groupByDate(ranges: DateRange[]): { [x: string]: DateRange[] } {
  const results = ranges.reduce(
    (
      previousValue: {
        [date: string]: DateRange[];
      },
      currentValue
    ) => {
      const dateString = LuxonDateTime.fromISO(currentValue.start).toFormat("yyyy-MM-dd");
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
  if (!ranges.length) return [];
  // Get the ranges of the first user
  let commonAvailability = ranges[0];

  // For each of the remaining users, find the intersection of their ranges with the current common availability
  for (let i = 1; i < ranges.length; i++) {
    const userRanges = ranges[i];
    console.log("userRanges.length", userRanges.length);

    const intersectedRanges: {
      start: LuxonDateTime;
      end: LuxonDateTime;
    }[] = [];

    commonAvailability.forEach((commonRange) => {
      userRanges.forEach((userRange) => {
        console.log(commonRange);
        console.log(userRange);
        const intersection = getIntersection(commonRange, userRange);
        if (intersection !== null) {
          // If the current common range intersects with the user range, add the intersected time range to the new array
          intersectedRanges.push(intersection);
        }
      });
    });

    commonAvailability = intersectedRanges;
  }

  // If the common availability is empty, there is no time when all users are available
  if (commonAvailability.length === 0) {
    return [];
  }

  return commonAvailability;
}

function getIntersection(range1: DateRange, range2: DateRange) {
  const start = range1.start.toUTC() > range2.start ? range1.start : range2.start;
  const end = range1.end.toUTC() < range2.end ? range1.end : range2.end;
  if (start.toUTC() < end) {
    return { start, end };
  }
  return null;
}

export function subtract(
  sourceRanges: (DateRange & { [x: string]: unknown })[],
  excludedRanges: DateRange[]
) {
  const result: DateRange[] = [];

  for (const { start: sourceStart, end: sourceEnd, ...passThrough } of sourceRanges) {
    let currentStart = sourceStart;

    const overlappingRanges = excludedRanges.filter(
      ({ start, end }) => start < sourceEnd && end > sourceStart
    );

    overlappingRanges.sort((a, b) => (a.start > b.start ? 1 : -1));

    for (const { start: excludedStart, end: excludedEnd } of overlappingRanges) {
      if (excludedStart > currentStart) {
        result.push({ start: currentStart, end: excludedStart });
      }
      currentStart = excludedEnd > currentStart ? excludedEnd : currentStart;
    }

    if (sourceEnd > currentStart) {
      result.push({ start: currentStart, end: sourceEnd, ...passThrough });
    }
  }

  return result;
}
