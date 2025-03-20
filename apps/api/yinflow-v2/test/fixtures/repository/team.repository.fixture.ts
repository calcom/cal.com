import { TestingModule } from "@nestjs/testing";
import { Prisma, Team } from "@prisma/client";

import { PrismaReadService } from "../../../src/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "../../../src/modules/prisma/prisma-write.service";

export class TeamRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
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
}
