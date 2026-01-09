import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsSchedulesService {
  constructor(
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11,
    private readonly schedulesRepository: SchedulesRepository_2024_06_11,
    private readonly usersRepository: UsersRepository
  ) {}

  async getOrganizationSchedules(organizationId: number, skip = 0, take = 250) {
    const users = await this.usersRepository.getOrganizationUsers(organizationId);
    const usersIds = users.map((user) => user.id);

    const schedules = await this.schedulesRepository.getSchedulesByUserIds(usersIds, skip, take);

    const responseSchedules: ScheduleOutput_2024_06_11[] = [];

    for (const schedule of schedules) {
      responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
    }

    return responseSchedules;
  }
}
