import { Injectable } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

import { OutputSchedulesService_2024_06_11 } from "../../../ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { OrganizationSchedulesRepository } from "../../organizations/repositories/organizations-schedules.repository";
import { UsersRepository } from "../../users/users.repository";

@Injectable()
export class OrganizationsSchedulesService {
  constructor(
    private readonly organizationSchedulesService: OrganizationSchedulesRepository,
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11,
    private readonly usersRepository: UsersRepository
  ) {}

  async getOrganizationSchedules(organizationId: number, skip = 0, take = 250) {
    const users = await this.usersRepository.getOrganizationUsers(organizationId);
    const usersIds = users.map((user) => user.id);

    const schedules = await this.organizationSchedulesService.getSchedulesByUserIds(usersIds, skip, take);

    const responseSchedules: ScheduleOutput_2024_06_11[] = [];

    for (const schedule of schedules) {
      responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
    }

    return responseSchedules;
  }
}
