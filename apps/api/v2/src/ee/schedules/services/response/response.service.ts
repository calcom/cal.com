import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import {
  transformWorkingHoursForClient,
  transformAvailabilityForClient,
  transformDateOverridesForClient,
} from "@calcom/platform-libraries";
import type {
  ScheduleWithAvailabilities,
  ScheduleWithAvailabilitiesForWeb,
} from "@calcom/platform-libraries";
import { ScheduleResponse, schemaScheduleResponse } from "@calcom/platform-types";

@Injectable()
export class ResponseService {
  constructor(private readonly schedulesRepository: SchedulesRepository) {}

  async formatSchedule(
    forAtom: boolean,
    user: User,
    schedule: ScheduleWithAvailabilities
  ): Promise<ScheduleResponse | ScheduleWithAvailabilitiesForWeb> {
    if (forAtom) {
      const usersSchedulesCount = await this.schedulesRepository.getUserSchedulesCount(user.id);
      return this.transformScheduleForAtom(schedule, usersSchedulesCount, user);
    }

    return schemaScheduleResponse.parse(schedule);
  }

  async formatSchedules(
    forAtom: boolean,
    user: User,
    schedules: ScheduleWithAvailabilities[]
  ): Promise<ScheduleResponse[] | ScheduleWithAvailabilitiesForWeb[]> {
    if (forAtom) {
      const usersSchedulesCount = await this.schedulesRepository.getUserSchedulesCount(user.id);
      return Promise.all(
        schedules.map((schedule) => this.transformScheduleForAtom(schedule, usersSchedulesCount, user))
      );
    }
    return schedules.map((schedule) => schemaScheduleResponse.parse(schedule));
  }

  async transformScheduleForAtom(
    schedule: ScheduleWithAvailabilities,
    userSchedulesCount: number,
    user: Pick<User, "id" | "defaultScheduleId" | "timeZone">
  ): Promise<ScheduleWithAvailabilitiesForWeb> {
    const timeZone = schedule.timeZone || user.timeZone;

    return {
      id: schedule.id,
      name: schedule.name,
      isManaged: schedule.userId !== user.id,
      workingHours: transformWorkingHoursForClient(schedule),
      schedule: schedule.availability,
      availability: transformAvailabilityForClient(schedule),
      timeZone,
      dateOverrides: transformDateOverridesForClient(schedule, timeZone),
      isDefault: user.defaultScheduleId === schedule.id,
      isLastSchedule: userSchedulesCount <= 1,
      readOnly: schedule.userId !== user.id,
    };
  }
}
