import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { OrganizationsTeamsSchedulesRepository } from "@/modules/organizations/teams/schedules/organizations-teams-schedules.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Injectable } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsTeamsSchedulesService {
  constructor(
    private readonly organizationTeamsSchedulesRepository: OrganizationsTeamsSchedulesRepository,
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11,
    private readonly teamsRepository: TeamsRepository
  ) {}

  async getOrganizationTeamSchedules(organizationId: number, teamId: number, skip = 0, take = 250) {
    const usersIds = await this.teamsRepository.getTeamUsersIds(teamId);

    const schedules = await this.organizationTeamsSchedulesRepository.getSchedulesByUserIds(usersIds, skip, take);

    const responseSchedules: ScheduleOutput_2024_06_11[] = [];

    for (const schedule of schedules) {
      responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
    }

    return responseSchedules;
  }
}
