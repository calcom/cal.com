import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../../../prisma/prisma-read.service";

@Injectable()
export class OrgUsersOOORepository {
  constructor(private readonly dbRead: PrismaReadService) {}
  async getOrgUsersOOOPaginated(
    orgId: number,
    skip: number,
    take: number,
    sort?: { sortStart?: "asc" | "desc"; sortEnd?: "asc" | "desc" },
    filters?: { email?: string }
  ) {
    console.log({ sort, filters });
    return this.dbRead.prisma.outOfOfficeEntry.findMany({
      where: {
        user: {
          ...(filters?.email && { email: filters.email }),
          profiles: {
            some: {
              organizationId: orgId,
            },
          },
        },
      },
      skip,
      take,
      include: { reason: true },
      ...(sort?.sortStart && { orderBy: { start: sort.sortStart } }),
      ...(sort?.sortEnd && { orderBy: { end: sort.sortEnd } }),
    });
  }
}
