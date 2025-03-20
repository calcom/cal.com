import { Injectable } from "@nestjs/common";

import { Prisma } from "@calcom/prisma/client";

import { PrismaReadService } from "../../prisma/prisma-read.service";
import { PrismaWriteService } from "../../prisma/prisma-write.service";

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

  async getByManagerOrganizationId(managerOrganizationId: number) {
    return this.dbRead.prisma.managedOrganization.findMany({
      where: {
        managerOrganizationId,
      },
    });
  }
}
