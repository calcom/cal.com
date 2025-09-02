import type { PaginationQuery } from "@/types";
import { NotFoundError } from "@/utils/error";

import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole } from "@calcom/prisma/client";
import { Schedule } from "@calcom/types/schedule";

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
      this.handleDatabaseError(error, "create user");
    }
  }

  async createSchedule(args: Prisma.ScheduleCreateArgs) {
    const data = await this.prisma.schedule.create(args);
    return data;
  }
}
