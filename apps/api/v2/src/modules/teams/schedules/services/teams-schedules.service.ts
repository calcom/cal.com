import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Injectable } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

@Injectable()
export class TeamsSchedulesService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly schedulesRepository: SchedulesRepository_2024_06_11,
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11
  ) {}

  async getTeamSchedules(teamId: number, skip = 0, take = 250) {
    const userIds = await this.teamsRepository.getTeamUsersIds(teamId);
    const schedules = await this.schedulesRepository.getSchedulesByUserIds(userIds, skip, take);

    const responseSchedules: ScheduleOutput_2024_06_11[] = [];

    for (const schedule of schedules) {
      responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
    }

    return responseSchedules;
  }
}
