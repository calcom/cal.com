import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsSchedulesService {
  constructor(
    private readonly schedulesService: SchedulesService_2024_06_11,
    private readonly usersRepository: UsersRepository
  ) {}

  async getOrganizationSchedules(organizationId: number) {
    const users = await this.usersRepository.getOrganizationUsers(organizationId);
    const usersIds = users.map((user) => user.id);

    const organizationSchedules: ScheduleOutput_2024_06_11[] = [];

    for (const userId of usersIds) {
      const userSchedules = await this.schedulesService.getUserSchedules(userId);
      organizationSchedules.push(...userSchedules);
    }

    return organizationSchedules;
  }
}
