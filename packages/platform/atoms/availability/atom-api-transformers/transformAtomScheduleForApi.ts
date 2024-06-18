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
        dateOverridesRanges?.ranges?.map((range) => ({
          date: `${range.start.getUTCFullYear}-${range.start.getUTCMonth}-${range.start.getUTCDate}`,
          startTime: `${range.start.getUTCHours}-${range.start.getUTCMinutes}`,
          endTime: `${range.end.getUTCHours}-${range.end.getUTCMinutes}`,
        })) ?? []
    ) ?? [];

  const availability = formatScheduleTime(schedule);

  return { name, timeZone, isDefault, availability, overrides };
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
