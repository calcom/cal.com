import type { SortOrderType } from "@calcom/platform-types";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { baseEventTypeSelect } from "@calcom/prisma/selects/event-types";
import { baseUserSelect } from "@calcom/prisma/selects/user";
import { Prisma } from "@prisma/client";


const teamEventTypeSelect = {
  ...baseEventTypeSelect,
  users: { select: baseUserSelect },
  hosts: {
    select: {
      isFixed: true,
      userId: true,
      user: { select: baseUserSelect },
    },
  },
  schedule: {
    select: { id: true, name: true, timeZone: true, availability: true },
  },
} satisfies Prisma.EventTypeSelect;

@Injectable()
export class TeamsEventTypesRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getTeamEventType(teamId: number, eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        id: eventTypeId,
        teamId,
      },
       select: teamEventTypeSelect,
    });
  }

  async getTeamEventTypeBySlug(teamId: number, eventTypeSlug: string, hostsLimit?: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        teamId_slug: {
          teamId,
          slug: eventTypeSlug,
        },
      },
      select: teamEventTypeSelect,
    });
  }

  async getEventTypeByTeamIdAndSlug(teamId: number, eventTypeSlug: string) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        teamId_slug: {
          teamId,
          slug: eventTypeSlug,
        },
      },
    });
  }

  async getEventTypeByTeamIdAndSlugWithOwnerAndTeam(teamId: number, eventTypeSlug: string) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        teamId_slug: {
          teamId,
          slug: eventTypeSlug,
        },
      },
      select: {
        owner: { select: baseUserSelect },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      }
    });
  }

  async getTeamEventTypes(teamId: number, sortCreatedAt?: SortOrderType) {
    return this.dbRead.prisma.eventType.findMany({
      where: {
        teamId,
      },
      ...(sortCreatedAt && { orderBy: { id: sortCreatedAt } }),
      select: teamEventTypeSelect,
    });
  }

  async getEventTypeById(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: teamEventTypeSelect,
    });
  }

  async getEventTypeChildren(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findMany({
      where: { parentId: eventTypeId },
      select: teamEventTypeSelect,
    });
  }

  async getEventTypeByIdWithChildren(eventTypeId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        children: {
          select: {
            id: true,
            title: true,
            slug: true,
            teamId: true,
          },
        },
      }
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

  async getByIdIncludeHostsAndUserDefaultSchedule(eventTypeId: number, teamId: number) {
    return this.dbRead.prisma.eventType.findUnique({
      where: {
        id: eventTypeId,
        teamId,
      },
      select: {
        id: true,
        scheduleId: true,
        hosts: {
          select: {
            scheduleId: true,
            userId: true,
            user: {
              select: {
                defaultScheduleId: true,
              },
            },
          },
        },
      },
    });
  }
}
