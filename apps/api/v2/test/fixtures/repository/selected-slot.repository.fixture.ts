import type { SelectedSlots } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class SelectedSlotRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getByUid(uid: string) {
    return this.prismaReadClient.selectedSlots.findFirst({ where: { uid } });
  }

  async deleteByUId(uid: SelectedSlots["uid"]) {
    return this.prismaWriteClient.selectedSlots.deleteMany({ where: { uid } });
  }

  async deleteAllByUserId(userId: number) {
    return this.prismaWriteClient.selectedSlots.deleteMany({ where: { userId } });
  }
}
