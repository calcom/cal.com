import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaHolidayRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findUserSettingsSelect<T extends Prisma.UserHolidaySettingsSelect>({
    userId,
    select,
  }: {
    userId: number;
    select: T;
  }) {
    return this.prismaClient.userHolidaySettings.findUnique({
      where: { userId },
      select,
    });
  }

  async findManyUserSettings(params: {
    userIds: number[];
    select: { countryCode: boolean; disabledIds: boolean };
  }) {
    return this.prismaClient.userHolidaySettings.findMany({
      where: { userId: { in: params.userIds } },
      select: { userId: true, ...params.select },
    });
  }
}
