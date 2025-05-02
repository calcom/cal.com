import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

export class VerifiedResourcesRepositoryFixtures {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async createPhone(data: Prisma.VerifiedNumberCreateInput) {
    return this.prismaWriteClient.verifiedNumber.create({ data });
  }

  async deleteEmailById(id: number) {
    return this.prismaWriteClient.verifiedEmail.delete({ where: { id } });
  }

  async deletePhoneById(id: number) {
    return this.prismaWriteClient.verifiedNumber.delete({ where: { id } });
  }
}
