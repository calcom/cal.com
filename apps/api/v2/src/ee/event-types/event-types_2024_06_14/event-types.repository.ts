import type { SortOrderType } from "@calcom/platform-types";
import type { Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { InputEventTransformed_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/transformed";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class EventTypesRepository_2024_06_14 {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async createUserEventType(
    userId: number,
    body: Omit<InputEventTransformed_2024_06_14, "destinationCalendar">
  ) {
    const { calVideoSettings, ...restBody } = body;

    return this.dbWrite.prisma.eventType.create({
      data: {
        ...restBody,
        userId,
        locations: body.locations,
        bookingFields: body.bookingFields,
        users: { connect: { id: userId } },
        ...(calVideoSettings && {
          calVideoSettings: {
            create: calVideoSettings,
          },
        }),
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

  private readonly usersInclude = {
    select: {
      id: true,
      name: true,
      username: true,
      isPlatformManaged: true,
      avatarUrl: true,
      brandColor: true,
      darkBrandColor: true,
      weekStart: true,
      metadata: true,
      organizationId: true,
      organization: {
        select: { slug: true },
      },
      movedToProfile: {
        select: {
          id: true,
          username: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              slug: true,
              isPlatform: true,
            },
          },
        },
      },
      profiles: {
        select: {
          id: true,
          username: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              slug: true,
              isPlatform: true,
            },
          },
        },
      },
    },
  };

  async getUserEventType(userId: number, eventTypeId: number) {
    return this.dbRead.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        userId,
      },
      include: { users: this.usersInclude, schedule: true, destinationCalendar: true },
    });
  }

  async getUserEventTypes(userId: number, sortCreatedAt?: SortOrderType) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        userId,
      },
      ...(sortCreatedAt && { orderBy: { id: sortCreatedAt } }),
      include: { users: this.usersInclude, schedule: true, destinationCalendar: true },
    });
  }

  async getUserEventTypesPublic(userId: number, sortCreatedAt?: SortOrderType) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        userId,
        hidden: false,
      },
      ...(sortCreatedAt && { orderBy: { id: sortCreatedAt } }),
      include: { users: this.usersInclude, schedule: true, destinationCalendar: true },
    });
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: {
        users: this.usersInclude,
        schedule: true,
        destinationCalendar: true,
        calVideoSettings: true,
      },
    });
  }

  async getEventTypeByIdWithHosts(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: {
        users: this.usersInclude,
        schedule: true,
        destinationCalendar: true,
        calVideoSettings: true,
        hosts: true,
      },
    });
  }

  async getEventTypeByIdIncludeUsersAndTeam(eventTypeId: number) {
    const eventType = await this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { users: true, team: true },
    });

    if (!eventType) {
      return null;
    }

    return {
      ...eventType,
      recurringEvent: eventType.recurringEvent as Prisma.JsonObject | null | undefined,
    };
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
      include: { users: this.usersInclude, schedule: true, destinationCalendar: true },
    });
  }

  async getUserEventTypeBySlugWithOwnerAndTeam(userId: number, slug: string) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: userId,
          slug: slug,
        },
      },
      include: { owner: true, team: true },
    });
  }

  async deleteEventType(eventTypeId: number) {
    return this.dbWrite.prisma.eventType.delete({ where: { id: eventTypeId } });
  }

  async isUserHostOfEventType(userId: number, eventTypeId: number) {
    const eventType = await this.dbRead.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        hosts: { some: { userId: userId } },
      },
      select: { id: true },
    });
    return !!eventType;
  }

  async isUserAssignedToEventType(userId: number, eventTypeId: number) {
    const eventType = await this.dbRead.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        users: { some: { id: userId } },
      },
      select: { id: true },
    });
    return !!eventType;
  }
}
