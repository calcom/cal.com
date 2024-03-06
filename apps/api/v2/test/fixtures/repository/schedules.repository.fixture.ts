import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Schedule } from "@prisma/client";

export class SchedulesRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getById(scheduleId: Schedule["id"]) {
    return this.primaReadClient.schedule.findFirst({ where: { id: scheduleId } });
  }

  async deleteById(scheduleId: Schedule["id"]) {
    return this.prismaWriteClient.schedule.delete({ where: { id: scheduleId } });
  }

  async deleteAvailabilities(scheduleId: Schedule["id"]) {
    return this.prismaWriteClient.availability.deleteMany({ where: { scheduleId } });
  }
}
