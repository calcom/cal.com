import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

import type { SortOrderType } from "@calcom/platform-types";

@Injectable()
export class OrganizationsEventTypesRepository {
  constructor(private readonly dbRead: PrismaReadService) {}
  async getOrganizationTeamsEventTypes(
    orgId: number,
    skip: number,
    take: number,
    sortCreatedAt?: SortOrderType
  ) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        team: {
          parentId: orgId,
        },
      },
      ...(sortCreatedAt && { orderBy: { id: sortCreatedAt } }),
      skip,
      take,
      include: { users: true, schedule: true, hosts: true, destinationCalendar: true },
    });
  }
}
