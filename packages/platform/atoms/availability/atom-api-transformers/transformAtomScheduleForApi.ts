import type {
  ScheduleAvailabilityInput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
  WeekDay,
} from "@calcom/platform-types";

import type { AvailabilityFormValues } from "../types";

export function transformAtomScheduleForApi(body: AvailabilityFormValues): UpdateScheduleInput_2024_06_11 {
  const { name, schedule, dateOverrides, timeZone, isDefault } = body;

  const overrides =
    dateOverrides.flatMap(
      (dateOverridesRanges) =>
        dateOverridesRanges?.ranges?.map((range) => transfromAtomOverrideForApi(range)) ?? []
    ) ?? [];

  const availability = formatScheduleTime(schedule);

  return { name, timeZone, isDefault, availability, overrides };
}

type AtomDateOverride = {
  start: Date;
  end: Date;
};

function transfromAtomOverrideForApi(override: AtomDateOverride) {
  const date = `${override.start.getUTCFullYear()}-${(override.start.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${override.start.getUTCDate().toString().padStart(2, "0")}`;

  return {
    date,
    startTime: padHoursMinutesWithZeros(`${override.start.getUTCHours()}:${override.start.getUTCMinutes()}`),
    endTime: padHoursMinutesWithZeros(`${override.end.getUTCHours()}:${override.end.getUTCMinutes()}`),
  };
}

function padHoursMinutesWithZeros(hhMM: string) {
  const [hours, minutes] = hhMM.split(":");

  const formattedHours = hours.padStart(2, "0");
  const formattedMinutes = minutes.padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}`;
}

function formatScheduleTime(
  weekSchedule: AvailabilityFormValues["schedule"]
): UpdateScheduleInput_2024_06_11["availability"] {
  const daysOfWeek: WeekDay[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const formattedSchedule = weekSchedule.map((daySchedule, index) =>
    daySchedule.map((event) => ({
      startTime: convertToHHMM(event.start.toISOString()),
      endTime: convertToHHMM(event.end.toISOString()),
      days: [daysOfWeek[index]],
    }))
  );

  const timeMap: { [key: string]: ScheduleAvailabilityInput_2024_06_11 } = {};

  formattedSchedule.flat().forEach((event) => {
    const timeKey = `${event.startTime}-${event.endTime}`;
    if (!timeMap[timeKey]) {
      timeMap[timeKey] = { startTime: event.startTime, endTime: event.endTime, days: [] };
    }
    timeMap[timeKey].days.push(...event.days);
  });

  return Object.values(timeMap);
}

function convertToHHMM(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
