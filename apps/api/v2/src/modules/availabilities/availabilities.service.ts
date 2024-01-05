import { Injectable } from "@nestjs/common";
import { Availability } from "@prisma/client";

@Injectable()
export class AvailabilitiesService {
  getDefaultAvailability(): AvailabilityInput {
    const startTime = new Date(new Date().setUTCHours(9, 0, 0, 0));
    const endTime = new Date(new Date().setUTCHours(17, 0, 0, 0));

    return {
      days: [1, 2, 3, 4, 5],
      startTime: startTime,
      endTime: endTime,
    };
  }
}

export type AvailabilityInput = Pick<Availability, "days" | "startTime" | "endTime">;
