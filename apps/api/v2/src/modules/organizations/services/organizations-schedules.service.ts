import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, Logger } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsSchedulesService {
  private readonly logger = new Logger("OrganizationsSchedulesService");

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

  async createSchedule(scheduleData: any) {
    const schedule = await this.organizationSchedulesService.createSchedule(scheduleData);
    this.logEvent('create', schedule.id);
    return schedule;
  }

  async updateSchedule(scheduleId: number, scheduleData: any) {
    const schedule = await this.organizationSchedulesService.updateSchedule(scheduleId, scheduleData);
    this.logEvent('update', scheduleId);
    return schedule;
  }

  async deleteSchedule(scheduleId: number) {
    const result = await this.organizationSchedulesService.deleteSchedule(scheduleId);
    this.logEvent('delete', scheduleId);
    return result;
  }

  private logEvent(action: string, scheduleId: number) {
    this.logger.log(`Performed ${action} action on schedule ${scheduleId}`);
  }
}
