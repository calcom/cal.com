import type { Availability as AvailabilityModel, Schedule as ScheduleModel } from "@prisma/client";

import type { ConfigType } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getWorkingHours } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";
import type { CreateScheduleInput, ScheduleAvailabilityInput } from "@calcom/platform-types";
import type { ScheduleOverrideInput } from "@calcom/platform-types";
import type { WeekDay } from "@calcom/platform-types";
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

export function transformInputCreateSchedule(inputSchedule: CreateScheduleInput) {
  const defaultAvailability: ScheduleAvailabilityInput[] = [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "09:00",
      endTime: "17:00",
    },
  ];
  const defaultOverrides: ScheduleOverrideInput[] = [];

  const availability = transformInputScheduleAvailability(inputSchedule.availability || defaultAvailability);
  const overrides = transformInputOverrides(inputSchedule.overrides || defaultOverrides);

  const internalCreateSchedule = {
    ...inputSchedule,
    availability,
    overrides,
  };

  return internalCreateSchedule;
}

export function transformInputScheduleAvailability(inputAvailability: ScheduleAvailabilityInput[]) {
  return inputAvailability.map((availability) => ({
    days: availability.days.map(transformDayToNumber),
    startTime: createDateFromHoursMinutes(availability.startTime),
    endTime: createDateFromHoursMinutes(availability.endTime),
  }));
}

export function transformInputOverrides(inputOverrides: ScheduleOverrideInput[]) {
  return inputOverrides.map((override) => ({
    date: new Date(override.date),
    startTime: createDateFromHoursMinutes(override.startTime),
    endTime: createDateFromHoursMinutes(override.endTime),
  }));
}

function createDateFromHoursMinutes(hoursMinutes: string): Date {
  const parts = hoursMinutes.split(":");

  if (parts.length < 2) {
    throw new Error("Invalid time format. Please use 'hh:mm'.");
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || hours < 0 || hours > 23) {
    throw new Error("Hours must be a number between 0 and 23.");
  }
  if (isNaN(minutes) || minutes < 0 || minutes > 59) {
    throw new Error("Minutes must be a number between 0 and 59.");
  }

  const today = new Date();

  const utcDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hours, minutes)
  );

  return utcDate;
}

function transformDayToNumber(day: WeekDay): number {
  const weekMap: { [key in WeekDay]: number } = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return weekMap[day];
}
