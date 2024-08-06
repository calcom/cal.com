import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import {
  getEventTypeById,
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
} from "@calcom/platform-libraries-0.0.22";
import { CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";

type InputEventTransformed = Omit<
  CreateEventTypeInput_2024_06_14,
  "lengthInMinutes" | "locations" | "bookingFields"
> & {
  length: number;
  slug: string;
  locations?: ReturnType<typeof transformApiEventTypeLocations>;
  bookingFields?: ReturnType<typeof transformApiEventTypeBookingFields>;
};

@Injectable()
export class EventTypesRepository_2024_06_14 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createUserEventType(userId: number, body: InputEventTransformed) {
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
