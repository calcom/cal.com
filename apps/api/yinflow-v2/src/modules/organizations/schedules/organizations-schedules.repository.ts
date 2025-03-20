import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../../prisma/prisma-read.service";
import { PrismaWriteService } from "../../prisma/prisma-write.service";

@Injectable()
export class OrganizationSchedulesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getSchedulesByUserIds(userIds: number[], skip: number, take: number) {
    return this.dbRead.prisma.schedule.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      include: {
        availability: true,
      },
      skip,
      take,
    });
  }
}
