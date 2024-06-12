import type { Availability } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { getWorkingHours } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";
import type { Schedule, TimeRange } from "@calcom/types/schedule";

type ScheduleAvailability = Pick<Availability, "days" | "startTime" | "endTime">[];
type ScheduleOverride = Pick<Availability, "date" | "startTime" | "endTime">[];

export function transformWorkingHoursForAtom(schedule: {
  timeZone: string | null;
  availability: ScheduleAvailability;
}) {
  return getWorkingHours(
    { timeZone: schedule.timeZone || undefined, utcOffset: 0 },
    schedule.availability || []
  );
}

export function transformAvailabilityForAtom(schedule: { availability: ScheduleAvailability }) {
  return transformScheduleToAvailabilityForAtom(schedule).map((a) =>
    a.map((startAndEnd) => ({
      ...startAndEnd,
      end: new Date(startAndEnd.end.toISOString().replace("23:59:00.000Z", "23:59:59.999Z")),
    }))
  );
}

export function transformDateOverridesForAtom(
  schedule: { availability: ScheduleOverride },
  timeZone: string
) {
  return schedule.availability.reduce((acc, override) => {
    // only if future date override
    const currentUtcOffset = dayjs().tz(timeZone).utcOffset();
    const currentTimeInTz = dayjs().utc().add(currentUtcOffset, "minute");

    if (!override.date || dayjs(override.date).isBefore(currentTimeInTz, "day")) {
      return acc;
    }
    const newValue = {
      start: dayjs
        .utc(override.date)
        .hour(override.startTime.getUTCHours())
        .minute(override.startTime.getUTCMinutes())
        .toDate(),
      end: dayjs
        .utc(override.date)
        .hour(override.endTime.getUTCHours())
        .minute(override.endTime.getUTCMinutes())
        .toDate(),
    };
    const dayRangeIndex = acc.findIndex(
      // early return prevents override.date from ever being empty.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (item) => yyyymmdd(item.ranges[0].start) === yyyymmdd(override.date!)
    );
    if (dayRangeIndex === -1) {
      acc.push({ ranges: [newValue] });
      return acc;
    }
    acc[dayRangeIndex].ranges.push(newValue);
    return acc;
  }, [] as { ranges: TimeRange[] }[]);
}

export const transformScheduleToAvailabilityForAtom = (schedule: { availability: ScheduleAvailability }) => {
  return schedule.availability.reduce(
    (schedule: Schedule, availability) => {
      availability.days.forEach((day) => {
        schedule[day].push({
          start: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate(),
              availability.startTime.getUTCHours(),
              availability.startTime.getUTCMinutes()
            )
          ),
          end: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate(),
              availability.endTime.getUTCHours(),
              availability.endTime.getUTCMinutes()
            )
          ),
        });
      });
      return schedule;
    },
    Array.from([...Array(7)]).map(() => [])
  );
};
