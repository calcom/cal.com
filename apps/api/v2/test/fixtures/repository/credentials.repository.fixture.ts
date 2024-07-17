import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

export class CredentialsRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  create(type: string, key: Prisma.InputJsonValue, userId: number, appId: string) {
    return this.prismaWriteClient.credential.create({
      data: {
        type,
        key,
        userId,
        appId,
      },
    });
  }

  delete(id: number) {
    return this.prismaWriteClient.credential.delete({
      where: {
        id,
      },
    });
  }
}
