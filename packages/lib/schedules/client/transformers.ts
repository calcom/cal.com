import type { Availability as AvailabilityModel, Schedule as ScheduleModel } from "@prisma/client";

import type { ConfigType } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getWorkingHours } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";
import type { Schedule, TimeRange } from "@calcom/types/schedule";

export type ScheduleWithAvailabilities = ScheduleModel & { availability: AvailabilityModel[] };

export type ScheduleWithAvailabilitiesForWeb = Pick<ScheduleModel, "id" | "name"> & {
  isManaged: boolean;
  workingHours: ReturnType<typeof transformWorkingHoursForClient>;
  schedule: AvailabilityModel[];
  availability: ReturnType<typeof transformAvailabilityForClient>;
  timeZone: string;
  dateOverrides: ReturnType<typeof transformDateOverridesForClient>;
  isDefault: boolean;
  isLastSchedule: boolean;
  readOnly: boolean;
};

type Availability = { userId?: number | null; days: number[]; startTime: ConfigType; endTime: ConfigType }[];

type Override = {
  userId?: number | null;
  days: number[];
  startTime: Date;
  endTime: Date;
  date: Date | null;
}[];

export function transformWorkingHoursForClient(schedule: {
  timeZone: string | null;
  availability: Availability;
}) {
  return getWorkingHours(
    { timeZone: schedule.timeZone || undefined, utcOffset: 0 },
    schedule.availability || []
  );
}

export function transformAvailabilityForClient(schedule: {
  availability: Pick<AvailabilityModel, "days" | "startTime" | "endTime">[];
}) {
  return transformScheduleToAvailabilityForClient(schedule).map((a) =>
    a.map((startAndEnd) => ({
      ...startAndEnd,
      end: new Date(startAndEnd.end.toISOString().replace("23:59:00.000Z", "23:59:59.999Z")),
    }))
  );
}

export function transformDateOverridesForClient(schedule: { availability: Override }, timeZone: string) {
  return schedule.availability.reduce((acc, override) => {
    // only iff future date override
    if (!override.date || dayjs.tz(override.date, timeZone).isBefore(dayjs(), "day")) {
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

export const transformScheduleToAvailabilityForClient = (schedule: {
  availability: Pick<AvailabilityModel, "days" | "startTime" | "endTime">[];
}) => {
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
