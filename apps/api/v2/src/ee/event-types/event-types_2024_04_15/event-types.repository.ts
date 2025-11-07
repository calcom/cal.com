import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
import { OrganizationsService } from "@/modules/organizations/index/organizations.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { getEventTypeById } from "@calcom/platform-libraries/event-types";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class EventTypesRepository_2024_04_15 {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService
  ) { }

  async createUserEventType(
    userId: number,
    body: Pick<CreateEventTypeInput_2024_04_15, "title" | "slug" | "length" | "hidden">
  ) {
    return this.dbWrite.prisma.eventType.create({
      data: {
        ...body,
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

  async getUserEventTypeForAtom(
    user: UserWithProfile,
    isUserOrganizationAdmin: boolean,
    eventTypeId: number
  ) {
    const organizationId = this.usersService.getUserMainOrgId(user);
    const isUserInPlatformOrganization = organizationId
      ? !!(await this.organizationsService.isPlatform(organizationId))
      : false;

    return await getEventTypeById({
      currentOrganizationId: organizationId,
      eventTypeId,
      userId: user.id,
      prisma: this.dbRead.prisma as unknown as PrismaClient,
      isUserOrganizationAdmin,
      isUserInPlatformOrganization,
      isTrpcCall: true,
    });
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({ where: { id: eventTypeId } });
  }

  async getUserEventTypeBySlug(userId: number, slug: string) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: userId,
          slug: slug,
        },
      },
    });
  }

  async deleteEventType(eventTypeId: number) {
    return this.dbWrite.prisma.eventType.delete({ where: { id: eventTypeId } });
  }

  async getEventTypeWithDuration(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { length: true },
    });
  }
}
