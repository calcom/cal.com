import { Injectable } from "@nestjs/common";

import {
  transformInputCreateSchedule as libraryTransformInputCreateSchedule,
  transformInputOverrides as libraryTransformInputOverrides,
  transformInputScheduleAvailability as libraryTransformInputScheduleAvailability,
} from "@calcom/platform-libraries";
import { CreateScheduleInput, ScheduleAvailabilityInput } from "@calcom/platform-types";
import { ScheduleOverrideInput } from "@calcom/platform-types";

@Injectable()
export class InputSchedulesService {
  transformInputCreateSchedule(inputSchedule: CreateScheduleInput) {
    return libraryTransformInputCreateSchedule(inputSchedule);
  }

  transformInputScheduleAvailability(inputAvailability: ScheduleAvailabilityInput[]) {
    return libraryTransformInputScheduleAvailability(inputAvailability);
  }

  transformInputOverrides(inputOverrides: ScheduleOverrideInput[]) {
    return libraryTransformInputOverrides(inputOverrides);
  }
}
