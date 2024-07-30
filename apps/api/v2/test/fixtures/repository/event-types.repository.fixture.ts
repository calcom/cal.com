import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { EventType } from "@prisma/client";

import { Prisma } from "@calcom/prisma/client";

export class EventTypesRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
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

  async create(
    data: Pick<CreateEventTypeInput_2024_04_15, "title" | "slug" | "length" | "hidden">,
    userId: number
  ) {
    return this.prismaWriteClient.eventType.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async createTeamEventType(data: Prisma.EventTypeCreateInput) {
    return this.prismaWriteClient.eventType.create({ data });
  }

  async delete(eventTypeId: EventType["id"]) {
    return this.prismaWriteClient.eventType.delete({ where: { id: eventTypeId } });
  }
}
