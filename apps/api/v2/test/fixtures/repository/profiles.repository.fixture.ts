import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { TestingModule } from "@nestjs/testing";
import type { Prisma } from "@prisma/client";

export class ProfileRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(profileId: number) {
    return this.prismaReadClient.profile.findFirst({ where: { id: profileId } });
  }

  async findByOrgIdUserId(orgId: number, userId: number) {
    return this.prismaReadClient.profile.findFirst({ where: { userId, organizationId: orgId } });
  }

  async create(data: Prisma.ProfileCreateInput) {
    return this.prismaWriteClient.profile.create({ data });
  }

  async delete(profileId: number) {
    return this.prismaWriteClient.profile.delete({ where: { id: profileId } });
  }
}
