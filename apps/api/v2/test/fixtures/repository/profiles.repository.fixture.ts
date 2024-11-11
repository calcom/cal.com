import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

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

  async create(data: Prisma.ProfileCreateInput) {
    return this.prismaWriteClient.profile.create({ data });
  }

  async delete(profileId: number) {
    return this.prismaWriteClient.profile.delete({ where: { id: profileId } });
  }
}
