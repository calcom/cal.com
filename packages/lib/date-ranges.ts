import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { Availability } from "@calcom/prisma/client";

export type DateRange = {
  start: Dayjs;
  end: Dayjs;
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
  const utcDateTo = dateTo.utc();
  const results = [];
  for (let date = dateFrom.startOf("day"); utcDateTo.isAfter(date); date = date.add(1, "day")) {
    const fromOffset = dateFrom.startOf("day").utcOffset();
    const offset = date.tz(timeZone).utcOffset();

    // it always has to be start of the day (midnight) even when DST changes
    const dateInTz = date.add(fromOffset - offset, "minutes").tz(timeZone);
    if (!item.days.includes(dateInTz.day())) {
      continue;
    }

    let start = dateInTz
      .add(item.startTime.getUTCHours(), "hours")
      .add(item.startTime.getUTCMinutes(), "minutes");

    let end = dateInTz.add(item.endTime.getUTCHours(), "hours").add(item.endTime.getUTCMinutes(), "minutes");

    const offsetBeginningOfDay = dayjs(start.format("YYYY-MM-DD hh:mm")).tz(timeZone).utcOffset();
    const offsetDiff = start.utcOffset() - offsetBeginningOfDay; // there will be 60 min offset on the day day of DST change

    start = start.add(offsetDiff, "minute");
    end = end.add(offsetDiff, "minute");

    const startResult = dayjs.max(start, dateFrom);
    const endResult = dayjs.min(end, dateTo.tz(timeZone));

    if (endResult.isBefore(startResult)) {
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

export function processDateOverride({ item, timeZone }: { item: DateOverride; timeZone: string }) {
  const startDate = dayjs
    .utc(item.date)
    .startOf("day")
    .add(item.startTime.getUTCHours(), "hours")
    .add(item.startTime.getUTCMinutes(), "minutes")
    .second(0)
    .tz(timeZone, true);
  const endDate = dayjs
    .utc(item.date)
    .startOf("day")
    .add(item.endTime.getUTCHours(), "hours")
    .add(item.endTime.getUTCMinutes(), "minutes")
    .second(0)
    .tz(timeZone, true);
  return {
    start: startDate,
    end: endDate,
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
      const dateString = dayjs(currentValue.start).format("YYYY-MM-DD");

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

    const intersectedRanges: {
      start: Dayjs;
      end: Dayjs;
    }[] = [];

    commonAvailability.forEach((commonRange) => {
      userRanges.forEach((userRange) => {
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
  const start = range1.start.utc().isAfter(range2.start) ? range1.start : range2.start;
  const end = range1.end.utc().isBefore(range2.end) ? range1.end : range2.end;
  if (start.utc().isBefore(end)) {
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
      ({ start, end }) => start.isBefore(sourceEnd) && end.isAfter(sourceStart)
    );

    overlappingRanges.sort((a, b) => (a.start.isAfter(b.start) ? 1 : -1));

    for (const { start: excludedStart, end: excludedEnd } of overlappingRanges) {
      if (excludedStart.isAfter(currentStart)) {
        result.push({ start: currentStart, end: excludedStart });
      }
      currentStart = excludedEnd.isAfter(currentStart) ? excludedEnd : currentStart;
    }

    if (sourceEnd.isAfter(currentStart)) {
      result.push({ start: currentStart, end: sourceEnd, ...passThrough });
    }
  }

  return result;
}
