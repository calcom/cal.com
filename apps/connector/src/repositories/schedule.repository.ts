import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class ScheduleRepository extends BaseRepository<User> {
  private oldUserRepo: OldUserRepository;
  constructor(prisma: PrismaClient) {
    super(prisma);
    this.oldUserRepo = new OldUserRepository(prisma);
  }

  async findByUserId(userId: number) {
    try {
      const data = await this.prisma.schedule.findMany({
        where: { userId },
        select: {
          id: true,
          userId: true,
          name: true,
          availability: true,
          timeZone: true,
        },
      });
      return data;
    } catch (error) {
      this.handleDatabaseError(error, "find schedules by user id");
    }
  }

  async createSchedule(args: Prisma.ScheduleCreateArgs) {
    try {
      const data = await this.prisma.schedule.create(args);
      return data;
    } catch (error) {
      this.handleDatabaseError(error, "create schedule");
    }
  }

  async updateSchedule(
    body: {
      timeZone?: string;
      name: string;
    },
    userId: number,
    scheduleId: number
  ) {
    try {
      const args: Prisma.ScheduleUpdateArgs = { data: { ...body, userId }, where: { id: scheduleId } };
      // We create default availabilities for the schedule
      // We include the recently created availability
      args.include = { availability: true };

      const data = await this.prisma.schedule.update(args);
      return data;
    } catch (error) {
      this.handleDatabaseError(error, "update schedule");
    }
  }

  async detachDefaultScheduleFromUsers(id: number) {
    try {
      await this.prisma.user.updateMany({
        where: { defaultScheduleId: id },
        data: { defaultScheduleId: undefined },
      });
    } catch (error) {
      this.handleDatabaseError(error, "detach default schedule from users");
    }
  }

  async deleteSchedule(id: number) {
    try {
      await this.prisma.schedule.delete({ where: { id } });
    } catch (error) {
      this.handleDatabaseError(error, "delete schedule");
    }
  }
}
