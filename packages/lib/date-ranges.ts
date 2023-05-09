import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { Availability } from "@calcom/prisma/client";

export type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

export function processWorkingHours({
  item,
  timeZone,
  dateFrom,
  dateTo,
}: {
  item: Availability;
  timeZone: string;
  dateFrom: Dayjs;
  dateTo: Dayjs;
}) {
  const results = [];
  for (
    const date = dateFrom.tz(timeZone), endDate = dateTo.tz(timeZone);
    date.isBefore(endDate);
    date.add(1, "day")
  ) {
    if (!item.days.includes(date.day())) {
      continue;
    }
    results.push({
      start: date.hour(item.startTime.getUTCHours()).minute(item.startTime.getUTCMinutes()).second(0),
      end: date.hour(item.endTime.getUTCHours()).minute(item.endTime.getUTCMinutes()).second(0),
    });
  }
  return results;
}

export function processDateOverride({ item, timeZone }: { item: Availability; timeZone: string }) {
  const date = dayjs.tz(item.date, timeZone);
  return {
    start: date.hour(item.startTime.getUTCHours()).minute(item.startTime.getUTCMinutes()).second(0),
    end: date.hour(item.endTime.getUTCHours()).minute(item.endTime.getUTCMinutes()).second(0),
  };
}

export function buildDateRanges({
  availability,
  timeZone /* Organizer timeZone */,
  dateFrom /* Attendee dateFrom */,
  dateTo /* `` dateTo */,
}: {
  timeZone: string;
  availability: Availability[];
  dateFrom: Dayjs;
  dateTo: Dayjs;
}): {
  start: Dayjs;
  end: Dayjs;
}[] {
  const groupedWorkingHours = groupByDate(
    availability
      .filter((item) => !!item.days.length)
      .flatMap((item) => processWorkingHours({ item, timeZone, dateFrom, dateTo }))
  );
  const groupedDateOverrides = groupByDate(
    availability.filter((item) => !!item.date).flatMap((item) => processDateOverride({ item, timeZone }))
  );

  return Object.values({
    ...groupedWorkingHours,
    ...groupedDateOverrides,
  }).flat();
}

export function groupByDate(ranges: DateRange[]): { [x: string]: DateRange[] } {
  const results = ranges.reduce(
    (
      previousValue: {
        [date: string]: DateRange[];
      },
      currentValue
    ) => {
      const dateString = currentValue.start.format("YYYY-mm-dd");
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function intersect(ranges: DateRange[]) {
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function subtract(aRanges: DateRange[], bRanges: DateRange[]) {
  return [];
}
