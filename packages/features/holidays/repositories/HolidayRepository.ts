import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

const holidayCacheSelect = {
  id: true,
  countryCode: true,
  calendarId: true,
  eventId: true,
  name: true,
  date: true,
  year: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HolidayCacheSelect;

const userHolidaySettingsSelect = {
  id: true,
  userId: true,
  countryCode: true,
  disabledIds: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserHolidaySettingsSelect;

export class HolidayRepository {
  static async findFirstCacheEntry({ countryCode, year }: { countryCode: string; year: number }) {
    return prisma.holidayCache.findFirst({
      where: {
        countryCode,
        year,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: holidayCacheSelect,
    });
  }

  static async findManyCachedHolidays({ countryCode, year }: { countryCode: string; year: number }) {
    return prisma.holidayCache.findMany({
      where: {
        countryCode,
        year,
      },
      orderBy: {
        date: "asc",
      },
      select: holidayCacheSelect,
    });
  }

  static async findCachedHolidaysInRange({
    countryCode,
    startDate,
    endDate,
  }: {
    countryCode: string;
    startDate: Date;
    endDate: Date;
  }) {
    return prisma.holidayCache.findMany({
      where: {
        countryCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
      select: holidayCacheSelect,
    });
  }

  static async deleteManyCacheEntries({ countryCode, year }: { countryCode: string; year: number }) {
    return prisma.holidayCache.deleteMany({
      where: {
        countryCode,
        year,
      },
    });
  }

  static async createManyCacheEntries(data: Prisma.HolidayCacheCreateManyInput[]) {
    return prisma.holidayCache.createMany({
      data,
      skipDuplicates: true,
    });
  }

  static async refreshCache({
    countryCode,
    year,
    holidays,
  }: {
    countryCode: string;
    year: number;
    holidays: Prisma.HolidayCacheCreateManyInput[];
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.holidayCache.deleteMany({
        where: {
          countryCode,
          year,
        },
      });

      if (holidays.length > 0) {
        await tx.holidayCache.createMany({
          data: holidays,
          skipDuplicates: true,
        });
      }
    });
  }

  static async findUserSettings({ userId }: { userId: number }) {
    return prisma.userHolidaySettings.findUnique({
      where: { userId },
      select: userHolidaySettingsSelect,
    });
  }

  static async findUserSettingsSelect<T extends Prisma.UserHolidaySettingsSelect>({
    userId,
    select,
  }: {
    userId: number;
    select: T;
  }) {
    return prisma.userHolidaySettings.findUnique({
      where: { userId },
      select,
    });
  }

  static async upsertUserSettings({
    userId,
    countryCode,
    disabledIds = [],
    resetDisabledHolidays = false,
  }: {
    userId: number;
    countryCode: string | null;
    disabledIds?: string[];
    resetDisabledHolidays?: boolean;
  }) {
    return prisma.userHolidaySettings.upsert({
      where: { userId },
      create: {
        userId,
        countryCode,
        disabledIds,
      },
      update: {
        countryCode,
        ...(resetDisabledHolidays ? { disabledIds: [] } : {}),
      },
      select: userHolidaySettingsSelect,
    });
  }

  static async updateUserSettings({
    userId,
    data,
  }: {
    userId: number;
    data: Prisma.UserHolidaySettingsUpdateInput;
  }) {
    return prisma.userHolidaySettings.update({
      where: { userId },
      data,
      select: userHolidaySettingsSelect,
    });
  }

  static async updateDisabledIds({ userId, disabledIds }: { userId: number; disabledIds: string[] }) {
    return prisma.userHolidaySettings.update({
      where: { userId },
      data: { disabledIds },
      select: userHolidaySettingsSelect,
    });
  }

  static async findBookingsInDateRanges({
    userId,
    dateRanges,
  }: {
    userId: number;
    dateRanges: Array<{ start: Date; end: Date }>;
  }) {
    if (dateRanges.length === 0) return [];

    return prisma.booking.findMany({
      where: {
        userId,
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
        OR: dateRanges.map(({ start, end }) => ({
          AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
        })),
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        attendees: {
          take: 1,
          select: { name: true },
        },
      },
    });
  }
}
