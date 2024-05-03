import { ScheduleAvailability } from "@/modules/availabilities/types/schedule-availability";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AvailabilitiesService {
  getDefaultAvailabilityInput(): ScheduleAvailability {
    return {
      days: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
    };
  }
}
