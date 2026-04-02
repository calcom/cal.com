import type { SortOrderType } from "@calcom/platform-types";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

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
