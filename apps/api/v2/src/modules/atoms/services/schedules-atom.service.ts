import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { GetBusyEventsQueryParams } from "@/modules/atoms/inputs/get-busy-events-query-params.input";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Logger, NotFoundException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { getUserAvailability } from "@calcom/platform-libraries/availability";
import { ScheduleRepository, UpdateScheduleResponse } from "@calcom/platform-libraries/schedules";
import { updateSchedule } from "@calcom/platform-libraries/schedules";
import { UpdateAtomScheduleDto } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class SchedulesAtomsService {
  private logger = new Logger("SchedulesAtomService");

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getSchedule({
    timeZone,
    userId,
    scheduleId,
    isManagedEventType,
  }: {
    timeZone: string;
    userId: number;
    scheduleId?: number;
    isManagedEventType?: boolean;
  }) {
    const user = await this.usersRepository.findById(userId);

    if (!user?.defaultScheduleId) return null;

    return await ScheduleRepository.findDetailedScheduleById({
      scheduleId: scheduleId ?? user.defaultScheduleId,
      isManagedEventType,
      userId,
      timeZone,
      defaultScheduleId: user.defaultScheduleId,
    });
  }

  async updateUserSchedule({
    input,
    user,
    scheduleId,
  }: {
    input: UpdateAtomScheduleDto;
    user: UserWithProfile;
    scheduleId: number;
  }): Promise<UpdateScheduleResponse> {
    return updateSchedule({
      input: {
        scheduleId,
        ...input,
      },
      user,
      prisma: this.dbWrite.prisma as unknown as PrismaClient,
    });
  }

  async getBusyEventsSchedule({ dateTo, dateFrom, username, eventSlug }: GetBusyEventsQueryParams) {
    const user = await this.usersRepository.findByUsername(username);

    if (!user) {
      throw new NotFoundException(`No user found with username ${username}`);
    }

    const event = await this.eventTypesRepository.getUserEventTypeBySlug(user.id, eventSlug);

    const busyEvents = await getUserAvailability({
      userId: user.id,
      dateFrom,
      dateTo,
      eventTypeId: event?.id,
      returnDateOverrides: true,
      bypassBusyCalendarTimes: false,
    });

    return busyEvents;
  }
}
