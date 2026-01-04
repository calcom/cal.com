import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

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
    if (!eventTypeId) {
      const userIds = await this.teamsRepository.getTeamUsersIds(teamId);
      const schedules = await this.schedulesRepository.getSchedulesByUserIds(userIds, skip, take);

      const responseSchedules: ScheduleOutput_2024_06_11[] = [];
      for (const schedule of schedules) {
        responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
      }

      return responseSchedules;
    }

    return this.getTeamSchedulesForEventType(teamId, eventTypeId, skip, take);
  }

  private async getTeamSchedulesForEventType(
    teamId: number,
    eventTypeId: number,
    skip: number,
    take: number
  ): Promise<ScheduleOutput_2024_06_11[]> {
    const eventType = await this.teamsEventTypesRepository.getByIdIncludeHostsAndUserDefaultSchedule(
      eventTypeId,
      teamId
    );

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found in team ${teamId}`);
    }

    const effectiveScheduleIds = new Set<number>();

    for (const host of eventType.hosts) {
      const effectiveScheduleId = host.scheduleId ?? host.user.defaultScheduleId ?? eventType.scheduleId;

      if (effectiveScheduleId) {
        effectiveScheduleIds.add(effectiveScheduleId);
      }
    }

    if (effectiveScheduleIds.size === 0) {
      return [];
    }

    const schedules = await this.schedulesRepository.getSchedulesByIds(
      Array.from(effectiveScheduleIds),
      skip,
      take
    );

    const responseSchedules: ScheduleOutput_2024_06_11[] = [];
    for (const schedule of schedules) {
      responseSchedules.push(await this.outputSchedulesService.getResponseSchedule(schedule));
    }

    return responseSchedules;
  }
}
