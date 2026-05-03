import { Injectable } from "@nestjs/common";

import { CreateScheduleInput_2024_06_11, ScheduleAvailabilityInput_2024_06_11 } from "@calcom/platform-types";
import { ScheduleOverrideInput_2024_06_11, WeekDay } from "@calcom/platform-types";

@Injectable()
export class InputSchedulesService_2024_06_11 {
  transformInputCreateSchedule(inputSchedule: CreateScheduleInput_2024_06_11) {
    const defaultAvailability: ScheduleAvailabilityInput_2024_06_11[] = [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "09:00",
        endTime: "17:00",
      },
    ];
    const defaultOverrides: ScheduleOverrideInput_2024_06_11[] = [];

    const availability = this.transformInputScheduleAvailability(
      inputSchedule.availability || defaultAvailability
    );
    const overrides = this.transformInputOverrides(inputSchedule.overrides || defaultOverrides);

    const internalCreateSchedule = {
      ...inputSchedule,
      availability,
      overrides,
    };

    return internalCreateSchedule;
  }

  transformInputScheduleAvailability(inputAvailability: ScheduleAvailabilityInput_2024_06_11[]) {
    return inputAvailability.map((availability) => ({
      days: availability.days.map(this.transformDayToNumber),
      startTime: this.createDateFromHoursMinutes(availability.startTime),
      endTime: this.createDateFromHoursMinutes(availability.endTime),
    }));
  }

  transformInputOverrides(inputOverrides: ScheduleOverrideInput_2024_06_11[]) {
    return inputOverrides.map((override) => ({
      date: new Date(override.date),
      startTime: this.createDateFromHoursMinutes(override.startTime),
      endTime: this.createDateFromHoursMinutes(override.endTime),
    }));
  }

  createDateFromHoursMinutes(hoursMinutes: string): Date {
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
  transformDayToNumber(day: WeekDay): number {
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
}
