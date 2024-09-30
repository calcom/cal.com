import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationSchedulesRepository {
  // TODO: PrismaReadService
  async getSchedulesByUserIds(userIds: number[], skip: number, take: number) {
    // return this.dbRead.prisma.schedule.findMany({
    //   where: {
    //     userId: {
    //       in: userIds,
    //     },
    //   },
    //   include: {
    //     availability: true,
    //   },
    //   skip,
    //   take,
    // });
  }
}
