import {
  getScheduleByEventSlugHandler,
  ScheduleRepository,
  UpdateScheduleResponse,
  updateSchedule,
} from "@calcom/platform-libraries/schedules";
import { UpdateAtomScheduleDto } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";

@Injectable()
export class SchedulesAtomsService {
  private logger = new Logger("SchedulesAtomService");

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dbRead: PrismaReadService,
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

  async getScheduleByEventSlug(user: UserWithProfile, eventSlug: string) {
    return getScheduleByEventSlugHandler({
      ctx: { user, prisma: this.dbRead.prisma as unknown as PrismaClient },
      input: { eventSlug },
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
