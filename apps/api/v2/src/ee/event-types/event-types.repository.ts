import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { getEventTypeById, slugify } from "@calcom/platform-libraries";
import { CreateEventTypeInput } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class EventTypesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createUserEventType(userId: number, body: CreateEventTypeInput) {
    const { lengthInMinutes, ...rest } = body;
    const length = lengthInMinutes;
    const slug = slugify(body.title);
    return this.dbWrite.prisma.eventType.create({
      data: {
        ...rest,
        length,
        slug,
        userId,
        locations: JSON.stringify(body.locations),
        bookingFields: JSON.stringify(body.bookingFields),
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
      include: { users: true, schedule: true },
    });
  }

  async getUserEventTypes(userId: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        userId,
      },
      include: { users: true, schedule: true },
    });
  }

  async getUserEventTypeForAtom(
    user: UserWithProfile,
    isUserOrganizationAdmin: boolean,
    eventTypeId: number
  ) {
    return await getEventTypeById({
      currentOrganizationId: user.movedToProfile?.organizationId || user.organizationId,
      eventTypeId,
      userId: user.id,
      prisma: this.dbRead.prisma as unknown as PrismaClient,
      isUserOrganizationAdmin,
      isTrpcCall: true,
    });
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { users: true, schedule: true },
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
      include: { users: true, schedule: true },
    });
  }

  async deleteEventType(eventTypeId: number) {
    return this.dbWrite.prisma.eventType.delete({ where: { id: eventTypeId } });
  }
}
