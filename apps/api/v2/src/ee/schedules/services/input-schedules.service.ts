import { Injectable } from "@nestjs/common";

import { CreateScheduleInput, ScheduleAvailabilityInput } from "@calcom/platform-types";
import { ScheduleOverrideInput } from "@calcom/platform-types";
import { WeekDay } from "@calcom/platform-types";

class InternalScheduleAvailability {
  days!: number[];
  startTime!: Date;
  endTime!: Date;
}

class InternalScheduleOverride {
  date!: Date;
  startTime!: Date;
  endTime!: Date;
}

export type CreateScheduleInputTransformed = Omit<CreateScheduleInput, "availability" | "overrides"> & {
  availability: InternalScheduleAvailability[];
  overrides: InternalScheduleOverride[];
};

@Injectable()
export class InputSchedulesService {
  transformInputCreateSchedule(inputSchedule: CreateScheduleInput): CreateScheduleInputTransformed {
    const defaultAvailability: ScheduleAvailabilityInput[] = [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "09:00",
        endTime: "17:00",
      },
    ];
    const defaultOverrides: ScheduleOverrideInput[] = [];

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

  transformInputScheduleAvailability(inputAvailability: ScheduleAvailabilityInput[]) {
    return inputAvailability.map((availability) => ({
      days: availability.days.map(transformDayToNumber),
      startTime: this.createDateFromHoursMinutes(availability.startTime),
      endTime: this.createDateFromHoursMinutes(availability.endTime),
    }));
  }

  transformInputOverrides(inputOverrides: ScheduleOverrideInput[]) {
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

    const today = new Date();

    const utcDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hours, minutes)
    );

    return utcDate;
  }
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
