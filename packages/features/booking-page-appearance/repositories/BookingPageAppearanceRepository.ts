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
}
