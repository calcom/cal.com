import type { CreateScheduleInput, ScheduleAvailabilityInput } from "@calcom/platform-types";
import type { ScheduleOverrideInput } from "@calcom/platform-types";
import type { WeekDay } from "@calcom/platform-types";

function transformInputCreateSchedule(inputSchedule: CreateScheduleInput) {
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

function transformInputScheduleAvailability(inputAvailability: ScheduleAvailabilityInput[]) {
  return inputAvailability.map((availability) => ({
    days: availability.days.map(transformDayToNumber),
    startTime: createDateFromHoursMinutes(availability.startTime),
    endTime: createDateFromHoursMinutes(availability.endTime),
  }));
}

function transformInputOverrides(inputOverrides: ScheduleOverrideInput[]) {
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

export {
  transformInputCreateSchedule,
  transformInputScheduleAvailability,
  transformInputOverrides,
  createDateFromHoursMinutes,
  transformDayToNumber,
};
