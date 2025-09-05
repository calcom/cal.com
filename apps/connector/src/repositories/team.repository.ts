import type { EventTypePaginationQuery } from "@/schema/event-type.schema";
import type { TeamPaginationQuery, MembershipPaginationQuery } from "@/schema/team.schema";
import { NotFoundError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma/client";
import type { Prisma, CalIdTeam, CalIdMembership, EventType } from "@calcom/prisma/client";
import { CalIdMembershipRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class TeamRepository extends BaseRepository<CalIdTeam> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: Prisma.CalIdTeamCreateInput): Promise<CalIdTeam> {
    try {
      return await this.prisma.calIdTeam.create({
        data,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  avatarUrl: true,
                  timeZone: true,
                },
              },
            },
          },
          eventTypes: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "create team");
    }
  }

  async findById(id: number): Promise<CalIdTeam | null> {
    try {
      return await this.prisma.calIdTeam.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  avatarUrl: true,
                  timeZone: true,
                },
              },
            },
          },
          eventTypes: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find team by id");
    }
  }

  async findByIdOrThrow(id: number): Promise<CalIdTeam> {
    const team = await this.findById(id);
    if (!team) {
      throw new NotFoundError("Team");
    }
    return team;
  }

  async findBySlug(slug: string): Promise<CalIdTeam | null> {
    try {
      return await this.prisma.calIdTeam.findFirst({
        where: { slug },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  avatarUrl: true,
                  timeZone: true,
                },
              },
            },
          },
          eventTypes: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find team by slug");
    }
  }

  async findByUserIdAndTeamId(userId: number, teamId: number): Promise<CalIdTeam | null> {
    try {
      return await this.prisma.calIdTeam.findFirst({
        where: {
          id: teamId,
          members: {
            some: {
              userId,
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  avatarUrl: true,
                  timeZone: true,
                },
              },
            },
          },
          eventTypes: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find team by user id and team id");
    }
  }

  async findByUserIdAndTeamIdOrThrow(userId: number, teamId: number): Promise<CalIdTeam> {
    const team = await this.findByUserIdAndTeamId(userId, teamId);
    if (!team) {
      throw new NotFoundError("CalIdTeam");
    }

    return team;
  }

  async findMany(filters: Prisma.CalIdTeamWhereInput = {}, pagination: TeamPaginationQuery = {}) {
    const { name, slug, isTeamPrivate } = filters;

    const where: Prisma.CalIdTeamWhereInput = { ...filters };

    if (name && typeof name === "string") {
      where.name = { contains: name, mode: "insensitive" };
    }

    if (slug && typeof slug === "string") {
      where.slug = { contains: slug, mode: "insensitive" };
    }

    if (typeof isTeamPrivate === "boolean") {
      where.isTeamPrivate = isTeamPrivate;
    }

    return this.executePaginatedQuery<CalIdTeam, Prisma.CalIdTeamOrderByWithRelationInput>(
      pagination,
      (options) =>
        this.prisma.calIdTeam.findMany({
          where,
          ...options,
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    avatarUrl: true,
                    timeZone: true,
                  },
                },
              },
            },
            eventTypes: true,
            _count: {
              select: {
                members: true,
                eventTypes: true,
              },
            },
          },
        }),
      () => this.prisma.calIdTeam.count({ where })
    );
  }

  async findManyByUserId(
    userId: number,
    filters: Omit<Prisma.CalIdTeamWhereInput, "members"> = {},
    pagination: TeamPaginationQuery = {}
  ) {
    const whereWithUserId: Prisma.CalIdTeamWhereInput = {
      ...filters,
      members: {
        some: {
          userId,
        },
      },
    };

    return this.findMany(whereWithUserId, pagination);
  }

  async update(id: number, data: Prisma.CalIdTeamUpdateInput): Promise<CalIdTeam> {
    try {
      return await this.prisma.calIdTeam.update({
        where: { id },
        data,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  avatarUrl: true,
                  timeZone: true,
                },
              },
            },
          },
          eventTypes: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "update team");
    }
  }

  async updateByUserIdAndTeamId(
    userId: number,
    teamId: number,
    data: Prisma.CalIdTeamUpdateInput
  ): Promise<CalIdTeam> {
    try {
      // First check if the team belongs to the user and user has admin/owner role
      await this.checkUserTeamPermissions(userId, teamId, [
        CalIdMembershipRole.ADMIN,
        CalIdMembershipRole.OWNER,
      ]);

      return await this.update(teamId, data);
    } catch (error) {
      this.handleDatabaseError(error, "update team by user id and team id");
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.calIdTeam.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete team");
    }
  }

  async deleteByUserIdAndTeamId(userId: number, teamId: number): Promise<void> {
    try {
      // First check if the team belongs to the user and user has owner role
      await this.checkUserTeamPermissions(userId, teamId, [CalIdMembershipRole.OWNER]);

      await this.delete(teamId);
    } catch (error) {
      this.handleDatabaseError(error, "delete team by user id and team id");
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const count = await this.prisma.calIdTeam.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check team exists");
    }
  }

  async existsByUserIdAndTeamId(userId: number, teamId: number): Promise<boolean> {
    try {
      const count = await this.prisma.calIdTeam.count({
        where: {
          id: teamId,
          members: {
            some: {
              userId,
            },
          },
        },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check team exists by user id and team id");
    }
  }

  async slugExists(slug: string, excludeTeamId?: number): Promise<boolean> {
    try {
      const where: Prisma.CalIdTeamWhereInput = { slug };

      if (excludeTeamId) {
        where.NOT = { id: excludeTeamId };
      }

      const count = await this.prisma.calIdTeam.count({ where });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check slug exists");
    }
  }

  // CalIdMembership methods
  async createMembership(data: Prisma.CalIdMembershipCreateInput): Promise<CalIdMembership> {
    try {
      return await this.prisma.calIdMembership.create({
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatarUrl: true,
              timeZone: true,
            },
          },
          calIdTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "create membership");
    }
  }

  async findMembershipById(id: number): Promise<CalIdMembership | null> {
    try {
      return await this.prisma.calIdMembership.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatarUrl: true,
              timeZone: true,
            },
          },
          calIdTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find membership by id");
    }
  }

  async findMembershipByIdOrThrow(id: number): Promise<CalIdMembership> {
    const membership = await this.findMembershipById(id);
    if (!membership) {
      throw new NotFoundError("Membership");
    }
    return membership;
  }

  async findMembershipsByTeamId(
    teamId: number,
    filters: Omit<Prisma.CalIdMembershipWhereInput, "calIdTeamId"> = {},
    pagination: MembershipPaginationQuery = {}
  ) {
    const where: Prisma.CalIdMembershipWhereInput = {
      ...filters,
      calIdTeamId: teamId,
    };

    return this.executePaginatedQuery<CalIdMembership, Prisma.CalIdMembershipOrderByWithRelationInput>(
      pagination,
      (options) =>
        this.prisma.calIdMembership.findMany({
          where,
          ...options,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                avatarUrl: true,
                timeZone: true,
              },
            },
            calIdTeam: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
      () => this.prisma.calIdMembership.count({ where })
    );
  }

  async updateMembership(id: number, data: Prisma.CalIdMembershipUpdateInput): Promise<CalIdMembership> {
    try {
      return await this.prisma.calIdMembership.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatarUrl: true,
              timeZone: true,
            },
          },
          calIdTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "update membership");
    }
  }

  async deleteMembership(id: number): Promise<void> {
    try {
      await this.prisma.calIdMembership.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete membership");
    }
  }

  async membershipExists(id: number): Promise<boolean> {
    try {
      const count = await this.prisma.calIdMembership.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check membership exists");
    }
  }

  // CalIdTeam Event Types methods
  async findEventTypesByTeamId(
    teamId: number,
    filters: Omit<Prisma.EventTypeWhereInput, "teamId"> = {},
    pagination: EventTypePaginationQuery = {}
  ) {
    const where: Prisma.EventTypeWhereInput = {
      ...filters,
      teamId,
    };

    return this.executePaginatedQuery<EventType, Prisma.EventTypeOrderByWithRelationInput>(
      pagination,
      (options) =>
        this.prisma.eventType.findMany({
          where,
          ...options,
        }),
      () => this.prisma.eventType.count({ where })
    );
  }

  async findEventTypeByTeamIdAndEventTypeId(teamId: number, eventTypeId: number): Promise<EventType | null> {
    try {
      return await this.prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
          teamId,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "find event type by team id and event type id");
    }
  }

  async findEventTypeByTeamIdAndEventTypeIdOrThrow(teamId: number, eventTypeId: number): Promise<EventType> {
    const eventType = await this.findEventTypeByTeamIdAndEventTypeId(teamId, eventTypeId);
    if (!eventType) {
      throw new NotFoundError("EventType");
    }
    return eventType;
  }

  // Helper method to check user permissions
  private async checkUserTeamPermissions(
    userId: number,
    teamId: number,
    allowedRoles: CalIdMembershipRole[]
  ): Promise<void> {
    const membership = await this.prisma.calIdMembership.findFirst({
      where: {
        userId,
        calIdTeamId: teamId,
        role: {
          in: allowedRoles,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError("Team or insufficient permissions");
    }
  }

  async getUserMembershipInTeam(userId: number, teamId: number): Promise<CalIdMembership | null> {
    try {
      return await this.prisma.calIdMembership.findFirst({
        where: {
          userId,
          calIdTeamId: teamId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatarUrl: true,
              timeZone: true,
            },
          },
          calIdTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "get user membership in team");
    }
  }

  async getTeamSchedules(teamId: number): Promise<any[]> {
    try {
      const memberships = await this.prisma.calIdMembership.findMany({
        where: { calIdTeamId: teamId, acceptedInvitation: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              defaultScheduleId: true,
              schedules: {
                select: {
                  id: true,
                  name: true,
                  timeZone: true,
                  availability: true,
                },
              },
            },
          },
        },
      });

      return memberships.map((membership) => ({
        userId: membership.user.id,
        userName: membership.user.name,
        userEmail: membership.user.email,
        schedules: membership.user.schedules.map((sc) => ({
          id: sc.id,
          name: sc.name,
          timeZone: sc.timeZone,
          availability: sc.availability,
          isDefault: sc.id === membership.user.defaultScheduleId,
        })),
      }));
    } catch (error) {
      this.handleDatabaseError(error, "get team schedules");
    }
  }
}
