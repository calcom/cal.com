import { Injectable } from "@nestjs/common";

import {
  transformApiScheduleOverrides,
  transformApiScheduleAvailability,
} from "@calcom/platform-libraries-0.0.4";
import { CreateScheduleInput_2024_06_11, ScheduleAvailabilityInput_2024_06_11 } from "@calcom/platform-types";
import { ScheduleOverrideInput_2024_06_11 } from "@calcom/platform-types";

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
    return transformApiScheduleAvailability(inputAvailability);
  }

  transformInputOverrides(inputOverrides: ScheduleOverrideInput_2024_06_11[]) {
    return transformApiScheduleOverrides(inputOverrides);
  }
}
