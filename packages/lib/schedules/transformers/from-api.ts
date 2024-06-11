import type { ScheduleAvailabilityInput_2024_06_11 } from "@calcom/platform-types/schedules/schedules-2024-06-11";
import type { ScheduleOverrideInput_2024_06_11 } from "@calcom/platform-types/schedules/schedules-2024-06-11";
import type { WeekDay } from "@calcom/platform-types/schedules/schedules-2024-06-11";

export function transformApiScheduleAvailability(inputAvailability: ScheduleAvailabilityInput_2024_06_11[]) {
  return inputAvailability.map((availability) => ({
    days: availability.days.map(transformDayToNumber),
    startTime: createDateFromHoursMinutes(availability.startTime),
    endTime: createDateFromHoursMinutes(availability.endTime),
  }));
}

export function transformApiScheduleOverrides(inputOverrides: ScheduleOverrideInput_2024_06_11[]) {
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

  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes));

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
