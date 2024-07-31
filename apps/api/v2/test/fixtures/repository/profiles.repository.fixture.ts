import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

export class ProfileRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(profileId: number) {
    return this.primaReadClient.profile.findFirst({ where: { id: profileId } });
  }

  async create(data: Prisma.ProfileCreateInput) {
    return this.prismaWriteClient.profile.create({ data });
  }

  async delete(profileId: number) {
    return this.prismaWriteClient.profile.delete({ where: { id: profileId } });
  }
}
