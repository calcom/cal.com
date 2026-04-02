import type { Prisma, Team } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class TeamRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(teamId: Team["id"]) {
    return this.prismaReadClient.team.findFirst({ where: { id: teamId } });
  }

  async create(data: Prisma.TeamCreateInput) {
    return this.prismaWriteClient.team.create({ data });
  }

  async delete(teamId: Team["id"]) {
    return this.prismaWriteClient.team.deleteMany({ where: { id: teamId } });
  }

  async getPlatformOrgTeams(organizationId: number, oAuthClientId: string) {
    return this.prismaReadClient.team.findMany({
      where: {
        parentId: organizationId,
        createdByOAuthClientId: oAuthClientId,
      },
    });
  }

  async createOrgSettings(
    organizationId: number,
    settings: {
      orgAutoAcceptEmail: string;
      isOrganizationVerified?: boolean;
      isOrganizationConfigured?: boolean;
      isAdminAPIEnabled?: boolean;
    }
  ) {
    return this.prismaWriteClient.organizationSettings.create({
      data: {
        organizationId,
        orgAutoAcceptEmail: settings.orgAutoAcceptEmail,
        isOrganizationVerified: settings.isOrganizationVerified,
        isOrganizationConfigured: settings.isOrganizationConfigured,
        isAdminAPIEnabled: settings.isAdminAPIEnabled,
      },
    });
  }

  async deleteOrgSettings(organizationId: number) {
    return this.prismaWriteClient.organizationSettings.deleteMany({
      where: { organizationId },
    });
  }
}
