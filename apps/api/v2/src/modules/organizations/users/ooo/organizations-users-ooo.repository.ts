import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

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
