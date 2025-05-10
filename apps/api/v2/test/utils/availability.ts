import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { randomString } from "test/utils/randomString";

export const UTC0 = "Africa/Freetown";

export function getWeeklyAvailability9To5(): CreateScheduleInput_2024_04_15 {
  return {
    name: `schedule-${randomString()}`,
    // note(Lauris): Africa/Freetown is UTC+0
    timeZone: UTC0,
    availabilities: [
      {
        days: [1, 2, 3, 4, 5, 6, 7],
        startTime: new Date(new Date().setUTCHours(9, 0, 0, 0)),
        endTime: new Date(new Date().setUTCHours(17, 0, 0, 0)),
      },
    ],
    isDefault: true,
  };
}
