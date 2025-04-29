import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

export class VerifiedResourcesRepositoryFixtures {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async deleteEmailById(id: number) {
    return this.prismaWriteClient.verifiedEmail.delete({ where: { id } });
  }

  async deletePhoneById(id: number) {
    return this.prismaWriteClient.verifiedEmail.delete({ where: { id } });
  }
}
