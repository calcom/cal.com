import type { PaginationQuery } from "@/types";
import { NotFoundError } from "@/utils/error";

import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole, Webhook } from "@calcom/prisma/client";
import { Schedule } from "@calcom/types/schedule";

import { BaseRepository } from "./base.repository";

export class WebhookRepository extends BaseRepository<Webhook> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByUserId(userId: number, limit: number, page: number): Promise<Webhook[]> {
    try {
      const skip = (page - 1) * limit;

      const data = await this.prisma.webhook.findMany({
        where: { userId },
        skip,
        take: limit,
      });
      return data;
    } catch (error) {
      this.handleDatabaseError(error, "find schedules by user id");
    }
  }
}
