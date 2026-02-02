import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { Prisma, Team } from "@calcom/prisma/client";

export class OrganizationRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(teamId: Team["id"]) {
    return this.primaReadClient.team.findFirst({ where: { id: teamId } });
  }

  async create(data: Prisma.TeamCreateInput) {
    return await this.prismaWriteClient.$transaction(async (prisma) => {
      const team = await prisma.team.create({
        data: {
          ...data,
          isOrganization: true,
        },
      });

      await prisma.organizationSettings.create({
        data: {
          organizationId: team.id,
          isAdminAPIEnabled: true,
          orgAutoAcceptEmail: "cal.com",
        },
      });
      return team;
    });
  }

  async updateSettings(
    teamId: Team["id"],
    settings: {
      orgAutoAcceptEmail?: string;
      isOrganizationVerified?: boolean;
      isOrganizationConfigured?: boolean;
    }
  ) {
    return this.prismaWriteClient.organizationSettings.update({
      where: { organizationId: teamId },
      data: settings,
    });
  }

  async delete(teamId: Team["id"]) {
    return await this.prismaWriteClient.$transaction(async (prisma) => {
      await prisma.organizationSettings.delete({
        where: { organizationId: teamId },
      });
      return prisma.team.delete({ where: { id: teamId } });
    });
  }
}
