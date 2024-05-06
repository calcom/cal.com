import { ScheduleAvailability } from "@/modules/availabilities/types/schedule-availability";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AvailabilitiesService {
  getDefaultAvailabilityInput(): ScheduleAvailability {
    const startDate = new Date();
    startDate.setUTCHours(9);
    startDate.setUTCMinutes(0);
    startDate.setUTCSeconds(0);

    const endDate = new Date();
    endDate.setUTCHours(17);
    endDate.setUTCMinutes(0);
    endDate.setUTCSeconds(0);

    return {
      days: [1, 2, 3, 4, 5],
      startTime: startDate,
      endTime: endDate,
    };
  }
}
