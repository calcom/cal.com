import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersService } from "@/modules/users/services/users.service";
import { Injectable } from "@nestjs/common";

import { InputEventTransformed_2024_06_14 } from "@calcom/platform-types";

@Injectable()
export class EventTypesRepository_2024_06_14 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createUserEventType(
    userId: number,
    body: Omit<InputEventTransformed_2024_06_14, "destinationCalendar">
  ) {
    return this.dbWrite.prisma.eventType.create({
      data: {
        ...body,
        userId,
        locations: body.locations,
        bookingFields: body.bookingFields,
        users: { connect: { id: userId } },
      },
    });
  }

  async getEventTypeWithSeats(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        users: { select: { id: true } },
        seatsPerTimeSlot: true,
        locations: true,
        requiresConfirmation: true,
      },
    });
  }

  async getEventTypeWithMetaData(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { metadata: true },
    });
  }

  async getEventTypeWithHosts(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { hosts: true },
    });
  }

  async getUserEventType(userId: number, eventTypeId: number) {
    return this.dbRead.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        userId,
      },
      include: { users: true, schedule: true, destinationCalendar: true },
    });
  }

  async getUserEventTypes(userId: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        userId,
      },
      include: { users: true, schedule: true, destinationCalendar: true },
    });
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { users: true, schedule: true, destinationCalendar: true },
    });
  }

  async getEventTypeByIdWithOwnerAndTeam(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { owner: true, team: true },
    });
  }

  async getUserEventTypeBySlug(userId: number, slug: string) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: userId,
          slug: slug,
        },
      },
      include: { users: true, schedule: true, destinationCalendar: true },
    });
  }

  async deleteEventType(eventTypeId: number) {
    return this.dbWrite.prisma.eventType.delete({ where: { id: eventTypeId } });
  }
}
