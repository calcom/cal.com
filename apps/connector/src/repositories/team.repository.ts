import type { EventTypePaginationQuery } from "@/schema/event-type.schema";
import type { TeamPaginationQuery, MembershipPaginationQuery } from "@/schema/team.schema";
import { NotFoundError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma/client";
import type { Prisma, Team, Membership, EventType } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class TeamRepository extends BaseRepository<Team> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(data: Prisma.TeamCreateInput): Promise<Team> {
    try {
      return await this.prisma.team.create({
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

  async findById(id: number): Promise<Team | null> {
    try {
      return await this.prisma.team.findUnique({
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

  async findByIdOrThrow(id: number): Promise<Team> {
    const team = await this.findById(id);
    if (!team) {
      throw new NotFoundError("Team");
    }
    return team;
  }

  async findBySlug(slug: string): Promise<Team | null> {
    try {
      return await this.prisma.team.findFirst({
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

  async findByUserIdAndTeamId(userId: number, teamId: number): Promise<Team | null> {
    try {
      return await this.prisma.team.findFirst({
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

  async findByUserIdAndTeamIdOrThrow(userId: number, teamId: number): Promise<Team> {
    const team = await this.findByUserIdAndTeamId(userId, teamId);
    if (!team) {
      throw new NotFoundError("Team");
    }

    return team;
  }

  async findMany(filters: Prisma.TeamWhereInput = {}, pagination: TeamPaginationQuery = {}) {
    const { name, slug, isPrivate } = filters;

    const where: Prisma.TeamWhereInput = { ...filters };

    if (name && typeof name === "string") {
      where.name = { contains: name, mode: "insensitive" };
    }

    if (slug && typeof slug === "string") {
      where.slug = { contains: slug, mode: "insensitive" };
    }

    if (typeof isPrivate === "boolean") {
      where.isPrivate = isPrivate;
    }

    return this.executePaginatedQuery<Team, Prisma.TeamOrderByWithRelationInput>(
      pagination,
      (options) =>
        this.prisma.team.findMany({
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
      () => this.prisma.team.count({ where })
    );
  }

  async findManyByUserId(
    userId: number,
    filters: Omit<Prisma.TeamWhereInput, "members"> = {},
    pagination: TeamPaginationQuery = {}
  ) {
    const whereWithUserId: Prisma.TeamWhereInput = {
      ...filters,
      members: {
        some: {
          userId,
        },
      },
    };

    return this.findMany(whereWithUserId, pagination);
  }

  async update(id: number, data: Prisma.TeamUpdateInput): Promise<Team> {
    try {
      return await this.prisma.team.update({
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

  async updateByUserIdAndTeamId(userId: number, teamId: number, data: Prisma.TeamUpdateInput): Promise<Team> {
    try {
      // First check if the team belongs to the user and user has admin/owner role
      await this.checkUserTeamPermissions(userId, teamId, [MembershipRole.ADMIN, MembershipRole.OWNER]);

      return await this.update(teamId, data);
    } catch (error) {
      this.handleDatabaseError(error, "update team by user id and team id");
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.team.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete team");
    }
  }

  async deleteByUserIdAndTeamId(userId: number, teamId: number): Promise<void> {
    try {
      // First check if the team belongs to the user and user has owner role
      await this.checkUserTeamPermissions(userId, teamId, [MembershipRole.OWNER]);

      await this.delete(teamId);
    } catch (error) {
      this.handleDatabaseError(error, "delete team by user id and team id");
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const count = await this.prisma.team.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check team exists");
    }
  }

  async existsByUserIdAndTeamId(userId: number, teamId: number): Promise<boolean> {
    try {
      const count = await this.prisma.team.count({
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
      const where: Prisma.TeamWhereInput = { slug };

      if (excludeTeamId) {
        where.NOT = { id: excludeTeamId };
      }

      const count = await this.prisma.team.count({ where });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check slug exists");
    }
  }

  // Team Membership methods
  async createMembership(data: Prisma.MembershipCreateInput): Promise<Membership> {
    try {
      return await this.prisma.membership.create({
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
          team: {
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

  async findMembershipById(id: number): Promise<Membership | null> {
    try {
      return await this.prisma.membership.findUnique({
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
          team: {
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

  async findMembershipByIdOrThrow(id: number): Promise<Membership> {
    const membership = await this.findMembershipById(id);
    if (!membership) {
      throw new NotFoundError("Membership");
    }
    return membership;
  }

  async findMembershipsByTeamId(
    teamId: number,
    filters: Omit<Prisma.MembershipWhereInput, "teamId"> = {},
    pagination: MembershipPaginationQuery = {}
  ) {
    const where: Prisma.MembershipWhereInput = {
      ...filters,
      teamId,
    };

    return this.executePaginatedQuery<Membership, Prisma.MembershipOrderByWithRelationInput>(
      pagination,
      (options) =>
        this.prisma.membership.findMany({
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
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
      () => this.prisma.membership.count({ where })
    );
  }

  async updateMembership(id: number, data: Prisma.MembershipUpdateInput): Promise<Membership> {
    try {
      return await this.prisma.membership.update({
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
          team: {
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
      await this.prisma.membership.delete({
        where: { id },
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete membership");
    }
  }

  async membershipExists(id: number): Promise<boolean> {
    try {
      const count = await this.prisma.membership.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error, "check membership exists");
    }
  }

  // Team Event Types methods
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
    allowedRoles: MembershipRole[]
  ): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        role: {
          in: allowedRoles,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError("Team or insufficient permissions");
    }
  }

  async getUserMembershipInTeam(userId: number, teamId: number): Promise<Membership | null> {
    try {
      return await this.prisma.membership.findFirst({
        where: {
          userId,
          teamId,
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
          team: {
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
      const memberships = await this.prisma.membership.findMany({
        where: { teamId, accepted: true },
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
