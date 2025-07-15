import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient, Prisma } from "@prisma/client";

import { CreateOAuthClientInput } from "@calcom/platform-types";

export class OOORepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: Prisma.OutOfOfficeEntryCreateInput) {
    return this.prismaWriteClient.outOfOfficeEntry.create({
      data: {
        ...data,
      },
    });
  }

  async delete(id: number) {
    return this.prismaWriteClient.outOfOfficeEntry.delete({
      where: {
        id,
      },
    });
  }
}
