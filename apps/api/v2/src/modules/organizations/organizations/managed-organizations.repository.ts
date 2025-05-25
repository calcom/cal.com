import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { SkipTakePagination } from "@calcom/platform-types";
import { Prisma } from "@calcom/prisma/client";

@Injectable()
export class ManagedOrganizationsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createManagedOrganization(managerOrganizationId: number, data: Prisma.TeamCreateInput) {
    return this.dbWrite.prisma.team.create({
      data: {
        ...data,
        managedOrganization: {
          create: {
            managerOrganization: {
              connect: { id: managerOrganizationId },
            },
          },
        },
      },
    });
  }

  async getByManagerManagedIds(managerOrganizationId: number, managedOrganizationId: number) {
    return this.dbRead.prisma.managedOrganization.findUnique({
      where: {
        managerOrganizationId_managedOrganizationId: {
          managerOrganizationId,
          managedOrganizationId,
        },
      },
    });
  }

  async getByManagerOrganizationIdPaginated(managerOrganizationId: number, pagination: SkipTakePagination) {
    const { skip, take } = pagination;

    const where: Prisma.ManagedOrganizationWhereInput = {
      managerOrganizationId,
    };

    const [totalItems, linkRows] = await this.dbRead.prisma.$transaction([
      this.dbRead.prisma.managedOrganization.count({ where }),
      this.dbRead.prisma.managedOrganization.findMany({
        where,
        skip,
        take,
        orderBy: { managedOrganizationId: "asc" },
        include: { managedOrganization: true },
      }),
    ]);

    const items = linkRows.map((l) => l.managedOrganization);

    return { totalItems, items };
  }
}
