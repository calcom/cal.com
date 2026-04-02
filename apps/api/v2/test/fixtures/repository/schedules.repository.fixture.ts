import type { Prisma, Schedule } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class SchedulesRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(schedule: Prisma.ScheduleCreateArgs["data"]) {
    return this.prismaWriteClient.schedule.create({ data: schedule });
  }

  async getById(scheduleId: Schedule["id"]) {
    return this.prismaReadClient.schedule.findFirst({ where: { id: scheduleId } });
  }

  async deleteById(scheduleId: Schedule["id"]) {
    return this.prismaWriteClient.schedule.delete({ where: { id: scheduleId } });
  }

  async deleteAvailabilities(scheduleId: Schedule["id"]) {
    return this.prismaWriteClient.availability.deleteMany({ where: { scheduleId } });
  }

  async getByUserId(userId: Schedule["userId"]) {
    return this.prismaReadClient.schedule.findMany({ where: { userId } });
  }
}
