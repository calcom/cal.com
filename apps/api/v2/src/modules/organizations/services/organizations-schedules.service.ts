import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsSchedulesService {
  constructor(
    private readonly schedulesService: SchedulesService_2024_06_11,
    private readonly usersRepository: UsersRepository
  ) {}

  async getOrganizationSchedules(organizationId: number) {
    const users = await this.usersRepository.getOrganizationUsers(organizationId);
    const usersIds = users.map((user) => user.id);

    const schedules = await Promise.all(
      usersIds.map((userId) => {
        return this.schedulesService.getUserSchedules(userId);
      })
    );

    return schedules.flat();
  }
}
