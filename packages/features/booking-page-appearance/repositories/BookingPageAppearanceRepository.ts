import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { BookingPageAppearance } from "@calcom/prisma/zod-utils";

export class BookingPageAppearanceRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByUserId(userId: number) {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        bookingPageAppearance: true,
        brandColor: true,
        darkBrandColor: true,
      },
    });
    return user;
  }

  async findByTeamId(teamId: number) {
    const team = await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        bookingPageAppearance: true,
        brandColor: true,
        darkBrandColor: true,
      },
    });
    return team;
  }

  async findByOrganizationId(organizationId: number) {
    const org = await this.prismaClient.team.findUnique({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      select: {
        bookingPageAppearance: true,
        brandColor: true,
        darkBrandColor: true,
      },
    });
    return org;
  }

  async updateByUserId(userId: number, appearance: BookingPageAppearance) {
    return await this.prismaClient.user.update({
      where: { id: userId },
      data: {
        bookingPageAppearance:
          appearance === null ? Prisma.DbNull : (appearance as Prisma.InputJsonObject),
      },
      select: {
        bookingPageAppearance: true,
      },
    });
  }

  async updateByTeamId(teamId: number, appearance: BookingPageAppearance) {
    return await this.prismaClient.team.update({
      where: { id: teamId },
      data: {
        bookingPageAppearance:
          appearance === null ? Prisma.DbNull : (appearance as Prisma.InputJsonObject),
      },
      select: {
        bookingPageAppearance: true,
      },
    });
  }

  async updateByOrganizationId(organizationId: number, appearance: BookingPageAppearance) {
    return await this.prismaClient.team.update({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      data: {
        bookingPageAppearance:
          appearance === null ? Prisma.DbNull : (appearance as Prisma.InputJsonObject),
      },
      select: {
        bookingPageAppearance: true,
      },
    });
  }

  async resetByUserId(userId: number) {
    return await this.prismaClient.user.update({
      where: { id: userId },
      data: {
        bookingPageAppearance: Prisma.DbNull,
      },
      select: {
        bookingPageAppearance: true,
      },
    });
  }

  async resetByTeamId(teamId: number) {
    return await this.prismaClient.team.update({
      where: { id: teamId },
      data: {
        bookingPageAppearance: Prisma.DbNull,
      },
      select: {
        bookingPageAppearance: true,
      },
    });
  }

  async resetByOrganizationId(organizationId: number) {
    return await this.prismaClient.team.update({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      data: {
        bookingPageAppearance: Prisma.DbNull,
      },
      select: {
        bookingPageAppearance: true,
      },
    });
  }

  async findEffectiveByUserId(userId: number): Promise<BookingPageAppearance | null> {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        bookingPageAppearance: true,
      },
    });

    if (!user) return null;

    const userAppearance = user.bookingPageAppearance as BookingPageAppearance | null;

    const profile = await this.prismaClient.profile.findFirst({
      where: { userId },
      select: {
        organization: {
          select: {
            id: true,
            bookingPageAppearance: true,
            organizationSettings: {
              select: {
                appearanceCascadePriority: true,
              },
            },
          },
        },
      },
    });

    if (!profile?.organization) {
      return userAppearance;
    }

    const org = profile.organization;
    const orgAppearance = org.bookingPageAppearance as BookingPageAppearance | null;
    const cascadePriority = org.organizationSettings?.appearanceCascadePriority;

    if (!orgAppearance) {
      return userAppearance;
    }

    if (cascadePriority === "USER_FIRST" && userAppearance) {
      return userAppearance;
    }

    return orgAppearance;
  }

  /**
   * Gets the effective appearance for a team event, considering organization cascade priority.
   * This is used for SSR injection on team booking pages.
   */
  async findEffectiveByTeamId(teamId: number): Promise<BookingPageAppearance | null> {
    const team = await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        bookingPageAppearance: true,
        parent: {
          select: {
            id: true,
            bookingPageAppearance: true,
            organizationSettings: {
              select: {
                appearanceCascadePriority: true,
              },
            },
          },
        },
      },
    });

    if (!team) return null;

    const teamAppearance = team.bookingPageAppearance as BookingPageAppearance | null;
    const org = team.parent;
    const orgAppearance = org?.bookingPageAppearance as BookingPageAppearance | null;
    const cascadePriority = org?.organizationSettings?.appearanceCascadePriority;

    if (!org || !orgAppearance) {
      return teamAppearance;
    }

    if (cascadePriority === "USER_FIRST" && teamAppearance) {
      return teamAppearance;
    }

    return orgAppearance;
  }
}
