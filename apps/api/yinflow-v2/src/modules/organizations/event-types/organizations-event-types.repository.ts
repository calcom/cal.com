import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../../prisma/prisma-read.service";

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
