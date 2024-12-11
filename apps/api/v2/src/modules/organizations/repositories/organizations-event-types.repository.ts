import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsEventTypesRepository {
  constructor(private readonly dbRead: PrismaReadService) {}
  async getOrganizationTeamsEventTypes(orgId: number, skip: number, take: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        team: {
          parentId: orgId,
        },
      },
      skip,
      take,
      include: { users: true, schedule: true, hosts: true, destinationCalendar: true },
    });
  }
}
