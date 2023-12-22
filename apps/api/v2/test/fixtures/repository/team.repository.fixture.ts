import { PrismaReadService } from "@/modules/services/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/services/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma, Team } from "@prisma/client";

export class TeamRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(teamId: Team["id"]) {
    return this.primaReadClient.team.findFirst({ where: { id: teamId } });
  }

  async create(data: Prisma.TeamCreateInput) {
    return this.prismaWriteClient.team.create({ data });
  }

  async delete(teamId: Team["id"]) {
    return this.prismaWriteClient.team.delete({ where: { id: teamId } });
  }
}
