import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { Injectable } from "@nestjs/common";

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
