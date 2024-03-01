import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";

import { getEventTypeById } from "@calcom/platform-libraries";

@Injectable()
export class EventTypesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createUserEventType(userId: number, body: CreateEventTypeInput) {
    return this.dbWrite.prisma.eventType.create({
      data: {
        ...body,
        metadata: {},
        userId,
        users: { connect: { id: userId } },
      },
    });
  }

  async getEventTypeWithSeats(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { users: { select: { id: true } }, seatsPerTimeSlot: true },
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

  async getUserEventTypeForAtom(user: User, isUserOrganizationAdmin: boolean, eventTypeId: number) {
    try {
      return getEventTypeById({
        currentOrganizationId: user.organizationId,
        eventTypeId,
        userId: user.id,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbRead.prisma,
        isUserOrganizationAdmin,
      });
    } catch (error) {
      throw new NotFoundException(`User with id ${user.id} has no event type with id ${eventTypeId}`);
    }
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({ where: { id: eventTypeId } });
  }
}
