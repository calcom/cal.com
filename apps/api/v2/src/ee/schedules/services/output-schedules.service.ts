import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import type { ScheduleWithAvailabilities } from "@calcom/platform-libraries";
import { WeekDay } from "@calcom/platform-types";

@Injectable()
export class OutputSchedulesService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getResponseSchedule(fetchedSchedule: ScheduleWithAvailabilities) {
    if (!fetchedSchedule.timeZone) {
      throw new Error("Failed to create schedule because its timezone is not set.");
    }

    const ownerDefaultScheduleId = await this.usersRepository.getUserScheduleDefaultId(
      fetchedSchedule.userId
    );

    const createdScheduleAvailabilities = fetchedSchedule.availability.filter(
      (availability) => !!availability.days.length
    );
    const createdScheduleOverrides = fetchedSchedule.availability.filter(
      (availability) => !availability.days.length
    );

    return {
      id: fetchedSchedule.id,
      ownerId: fetchedSchedule.userId,
      name: fetchedSchedule.name,
      timeZone: fetchedSchedule.timeZone,
      availability: createdScheduleAvailabilities.map((availability) => ({
        days: availability.days.map(transformNumberToDay),
        startTime: this.padHoursMinutesWithZeros(
          availability.startTime.getUTCHours() + ":" + availability.startTime.getUTCMinutes()
        ),
        endTime: this.padHoursMinutesWithZeros(
          availability.endTime.getUTCHours() + ":" + availability.endTime.getUTCMinutes()
        ),
      })),
      isDefault: fetchedSchedule.id === ownerDefaultScheduleId,
      overrides: createdScheduleOverrides.map((availability) => ({
        date:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          availability.date!.getUTCFullYear() +
          "-" +
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (availability.date!.getUTCMonth() + 1).toString().padStart(2, "0") +
          "-" +
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          availability.date!.getUTCDate().toString().padStart(2, "0"),
        startTime: this.padHoursMinutesWithZeros(
          availability.startTime.getUTCHours() + ":" + availability.startTime.getUTCMinutes()
        ),
        endTime: this.padHoursMinutesWithZeros(
          availability.endTime.getUTCHours() + ":" + availability.endTime.getUTCMinutes()
        ),
      })),
    };
  }

  padHoursMinutesWithZeros(hhMM: string) {
    const [hours, minutes] = hhMM.split(":");

    const formattedHours = hours.padStart(2, "0");
    const formattedMinutes = minutes.padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}`;
  }
}

function transformNumberToDay(day: number): WeekDay {
  const weekMap: { [key: number]: WeekDay } = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return weekMap[day];
}
