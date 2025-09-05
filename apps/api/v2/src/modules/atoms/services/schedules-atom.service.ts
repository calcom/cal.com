import {
  ScheduleRepository,
  UpdateScheduleResponse,
  updateSchedule,
} from "@calcom/platform-libraries/schedules";
import { UpdateAtomScheduleDto } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";

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
}
