import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { ScheduleRepository, UpdateScheduleResponse } from "@calcom/platform-libraries/schedules";
import { updateSchedule } from "@calcom/platform-libraries/schedules";
import { UpdateAtomScheduleDto } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class SchedulesAtomsService {
  private logger = new Logger("SchedulesAtomService");

  constructor(
    private readonly usersRepository: UsersRepository,
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
    const scheduleRepo = new ScheduleRepository(this.dbWrite.prisma as unknown as PrismaClient);
    return await scheduleRepo.findDetailedScheduleById({
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
}
