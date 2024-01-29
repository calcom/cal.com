import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { EventType } from "@prisma/client";
import { CreateEventTypeInput } from "dist/ee/event-types/inputs/create-event-type.input";

export class EventTypesRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: CreateEventTypeInput, userId: number) {
    return this.prismaWriteClient.eventType.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async delete(eventTypeId: EventType["id"]) {
    return this.prismaWriteClient.eventType.delete({ where: { id: eventTypeId } });
  }
}
