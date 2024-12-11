import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsEventTypesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getTeamEventType(teamId: number, eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        id: eventTypeId,
        teamId,
      },
      include: { users: true, schedule: true, hosts: true, destinationCalendar: true },
    });
  }

  async getTeamEventTypeBySlug(teamId: number, eventTypeSlug: string) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        teamId_slug: {
          teamId,
          slug: eventTypeSlug,
        },
      },
      include: {
        users: true,
        schedule: true,
        hosts: true,
        destinationCalendar: true,
        team: { select: { bannerUrl: true } },
      },
    });
  }

  async getTeamEventTypes(teamId: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        teamId,
      },
      include: {
        users: true,
        schedule: true,
        hosts: true,
        destinationCalendar: true,
        team: { select: { bannerUrl: true } },
      },
    });
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { users: true, schedule: true, hosts: true, destinationCalendar: true },
    });
  }

  async getEventTypeChildren(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: { parentId: eventTypeId },
      include: { users: true, schedule: true, hosts: true, destinationCalendar: true },
    });
  }

  async getTeamsEventTypes(orgId: number, skip: number, take: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        team: {
          parentId: orgId,
        },
      },
      skip,
      take,
      include: { users: true, schedule: true, hosts: true, destinationCalendar: true },
    });
  }

  async getEventTypeByIdWithChildren(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { children: true },
    });
  }

  async deleteUserManagedTeamEventTypes(userId: number, teamId: number) {
    return this.dbWrite.prisma.eventType.deleteMany({
      where: {
        parent: {
          teamId,
        },
        userId,
      },
    });
  }

  async removeUserFromTeamEventTypesHosts(userId: number, teamId: number) {
    return this.dbWrite.prisma.host.deleteMany({
      where: {
        userId,
        eventType: {
          teamId,
        },
      },
    });
  }
}
