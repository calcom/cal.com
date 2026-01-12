import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { EventType, Prisma } from "@calcom/prisma/client";

export class EventTypesRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async getAllUserEventTypes(userId: number) {
    return this.prismaWriteClient.eventType.findMany({
      where: {
        userId,
      },
    });
  }

  async getAllTeamEventTypes(teamId: number) {
    return this.prismaWriteClient.eventType.findMany({
      where: {
        teamId,
      },
      include: {
        hosts: true,
      },
    });
  }

  async create(data: Prisma.EventTypeCreateInput, userId: number) {
    return this.prismaWriteClient.eventType.create({
      data: {
        ...data,
        users: {
          connect: {
            id: userId,
          },
        },
        owner: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async createTeamEventType(data: Prisma.EventTypeCreateInput) {
    return this.prismaWriteClient.eventType.create({ data });
  }

  async delete(eventTypeId: EventType["id"]) {
    return this.prismaWriteClient.eventType.delete({ where: { id: eventTypeId } });
  }

  async deleteAllTeamEventTypes(teamId: number) {
    return this.prismaWriteClient.eventType.deleteMany({
      where: {
        teamId,
      },
    });
  }

  async deleteAllUserEventTypes(userId: number) {
    return this.prismaWriteClient.eventType.deleteMany({
      where: {
        userId,
      },
    });
  }

  async findById(eventTypeId: EventType["id"]) {
    return this.prismaReadClient.eventType.findUnique({ where: { id: eventTypeId } });
  }
}
