import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import type { WeekDay } from "@calcom/platform-types";
import type { Availability, Schedule } from "@calcom/prisma/client";

type DatabaseSchedule = Schedule & { availability: Availability[] };

@Injectable()
export class OutputSchedulesService_2024_06_11 {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getResponseSchedules(databaseSchedules: DatabaseSchedule[]) {
    if (databaseSchedules.length === 0) return [];
    const userIds = [...new Set(databaseSchedules.map((schedule) => schedule.userId))];
    const defaultScheduleIds = await this.usersRepository.getUsersScheduleDefaultIds(userIds);

    return databaseSchedules.map((schedule) =>
      this.transformScheduleToOutput(schedule, defaultScheduleIds.get(schedule.userId) ?? null)
    );
  }

  async getResponseSchedule(databaseSchedule: DatabaseSchedule) {
    const ownerDefaultScheduleId = await this.usersRepository.getUserScheduleDefaultId(
      databaseSchedule.userId
    );
    return this.transformScheduleToOutput(databaseSchedule, ownerDefaultScheduleId);
  }

  private transformScheduleToOutput(
    databaseSchedule: DatabaseSchedule,
    ownerDefaultScheduleId: number | null
  ) {
    const timeZone = databaseSchedule.timeZone || "Europe/London";

    const createdScheduleAvailabilities = databaseSchedule.availability.filter(
      (availability) => !!availability.days.length
    );
    const createdScheduleOverrides = databaseSchedule.availability.filter((override) => !!override.date);

    return {
      id: databaseSchedule.id,
      ownerId: databaseSchedule.userId,
      name: databaseSchedule.name,
      timeZone,
      availability: createdScheduleAvailabilities.map((availability) => ({
        days: availability.days.map(transformNumberToDay),
        startTime: this.padHoursMinutesWithZeros(
          availability.startTime.getUTCHours() + ":" + availability.startTime.getUTCMinutes()
        ),
        endTime: this.padHoursMinutesWithZeros(
          availability.endTime.getUTCHours() + ":" + availability.endTime.getUTCMinutes()
        ),
      })),
      isDefault: databaseSchedule.id === ownerDefaultScheduleId,
      overrides: createdScheduleOverrides.map((override) => ({
        date:
          override.date?.getUTCFullYear() +
          "-" +
          (override.date ? override.date.getUTCMonth() + 1 : "").toString().padStart(2, "0") +
          "-" +
          override.date?.getUTCDate().toString().padStart(2, "0"),
        startTime: this.padHoursMinutesWithZeros(
          override.startTime.getUTCHours() + ":" + override.startTime.getUTCMinutes()
        ),
        endTime: this.padHoursMinutesWithZeros(
          override.endTime.getUTCHours() + ":" + override.endTime.getUTCMinutes()
        ),
      })),
    };
  }

  private padHoursMinutesWithZeros(hhMM: string) {
    const [hours, minutes] = hhMM.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
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
