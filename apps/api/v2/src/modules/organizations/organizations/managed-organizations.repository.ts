import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

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
      include: {
        managedOrganization: true,
      },
    });
  }

  async getByManagedManagerIds(managerOrganizationId: number, managedOrganizationId: number) {
    return this.dbRead.prisma.managedOrganization.findUnique({
      where: {
        managerOrganizationId_managedOrganizationId: {
          managerOrganizationId,
          managedOrganizationId,
        },
      },
    });
  }
}
