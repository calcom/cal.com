import type { PaginationQuery } from "@/types";
import { AvailabilityCreation } from "@/types/availability";
import { NotFoundError } from "@/utils/error";

import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class AvailabilityRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(body: AvailabilityCreation) {
    const availability = await this.prisma.availability.create({
      data: body,
      include: { Schedule: { select: { userId: true } } },
    });

    return availability
  }

  async delete(id: number) {
    return await this.prisma.availability.delete({ where: { id } });
  }
}
