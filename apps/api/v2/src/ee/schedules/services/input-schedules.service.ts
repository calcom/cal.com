import { Injectable } from "@nestjs/common";

import { transformApiScheduleOverrides, transformApiScheduleAvailability } from "@calcom/platform-libraries";
import { CreateScheduleInput, ScheduleAvailabilityInput } from "@calcom/platform-types";
import { ScheduleOverrideInput } from "@calcom/platform-types";

@Injectable()
export class InputSchedulesService {
  transformInputCreateSchedule(inputSchedule: CreateScheduleInput) {
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
    return transformApiScheduleAvailability(inputAvailability);
  }

  transformInputOverrides(inputOverrides: ScheduleOverrideInput[]) {
    return transformApiScheduleOverrides(inputOverrides);
  }
}
