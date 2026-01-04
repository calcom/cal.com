import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Injectable } from "@nestjs/common";

import { ScheduleOutput_2024_06_11 } from "@calcom/platform-types";

@Injectable()
export class TeamsSchedulesService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly schedulesRepository: SchedulesRepository_2024_06_11,
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository
  ) {}

  async getTeamSchedules(teamId: number, skip = 0, take = 250, eventTypeId?: number) {
    let schedules;

    if (eventTypeId) {
      const scheduleIds = await this.teamsEventTypesRepository.getEventTypeHostScheduleIds(
        teamId,
        eventTypeId
      );
      schedules = await this.schedulesRepository.getSchedulesByIds(scheduleIds, skip, take);
    } else {
      const userIds = await this.teamsRepository.getTeamUsersIds(teamId);
      schedules = await this.schedulesRepository.getSchedulesByUserIds(userIds, skip, take);
    }

    const responseSchedules: ScheduleOutput_2024_06_11[] = [];

    for (const schedule of schedules) {
      responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
    }

    return responseSchedules;
  }
}
