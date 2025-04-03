import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import { Prisma } from "@calcom/prisma/client";

export class HostsRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: Prisma.HostCreateInput) {
    return this.prismaWriteClient.host.create({
      data: {
        ...data,
      },
    });
  }

  async getEventTypeHosts(eventTypeId: number) {
    return this.prismaReadClient.host.findMany({ where: { eventTypeId } });
  }
}
