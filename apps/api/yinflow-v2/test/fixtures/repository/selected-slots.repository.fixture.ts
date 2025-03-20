import { TestingModule } from "@nestjs/testing";
import { SelectedSlots } from "@prisma/client";

import { PrismaReadService } from "../../../src/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "../../../src/modules/prisma/prisma-write.service";

export class SelectedSlotsRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getByUid(uid: string) {
    return this.prismaReadClient.selectedSlots.findFirst({ where: { uid } });
  }

  async deleteByUId(uid: SelectedSlots["uid"]) {
    return this.prismaWriteClient.selectedSlots.deleteMany({ where: { uid } });
  }
}
