import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable, NotFoundException } from "@nestjs/common";

import { getEventTypeById } from "@calcom/platform-libraries";

@Injectable()
export class EventTypesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaReadService) {}

  async createUserEventType(userId: number, body: CreateEventTypeInput) {
    return this.dbWrite.prisma.eventType.create({
      data: {
        ...body,
        userId,
        users: { connect: { id: userId } },
      },
    });
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    return this.dbRead.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        userId,
      },
    });
  }

  async getUserEventTypeForAtom(userId: number, isUserOrganizationAdmin: boolean, eventTypeId: number) {
    try {
      return getEventTypeById({
        eventTypeId,
        userId,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbRead.prisma,
        isUserOrganizationAdmin,
      });
    } catch (error) {
      throw new NotFoundException(`User with id ${userId} has no event type with id ${eventTypeId}`);
    }
  }
}
