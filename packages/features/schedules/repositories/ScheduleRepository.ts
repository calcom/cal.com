import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";
import {
  transformAvailabilityForAtom,
  transformDateOverridesForAtom,
  transformWorkingHoursForAtom,
} from "@calcom/lib/schedules/transformers";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

export type FindDetailedScheduleByIdReturnType = Awaited<
  ReturnType<ScheduleRepository["findDetailedScheduleById"]>
>;

export class ScheduleRepository {
  // when instantiating, prismaClient injection is required
  constructor(private readonly prismaClient: PrismaClient) {
    if (!prismaClient) {
      throw new Error("PrismaClient is required for ScheduleRepository");
    }
  }

  async findScheduleByIdForBuildDateRanges({ scheduleId }: { scheduleId: number }) {
    const schedule = await this.prismaClient.schedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        timeZone: true,
        userId: true,
        availability: {
          select: {
            days: true,
            startTime: true,
            endTime: true,
            date: true,
          },
        },
        user: {
          select: {
            id: true,
            defaultScheduleId: true,
            travelSchedules: {
              select: {
                id: true,
                timeZone: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    return schedule;
  }

  async findScheduleByIdForOwnershipCheck({ scheduleId }: { scheduleId: number }) {
    const schedule = await this.prismaClient.schedule.findUnique({
      where: {
        id: scheduleId,
      },
      select: {
        userId: true,
      },
    });
    return schedule;
  }

  async findScheduleById({ id }: { id: number }) {
    const schedule = await this.prismaClient.schedule.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        availability: true,
        timeZone: true,
      },
    });

    return schedule;
  }

  async findDetailedScheduleById({
    isManagedEventType,
    scheduleId,
    userId,
    defaultScheduleId,
    timeZone: userTimeZone,
  }: {
    timeZone: string;
    userId: number;
    defaultScheduleId: number | null;
    scheduleId?: number;
    isManagedEventType?: boolean;
  }) {
    const schedule = await this.prismaClient.schedule.findUnique({
      where: {
        id: scheduleId || (await this.getDefaultScheduleId(userId)),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        availability: true,
        timeZone: true,
      },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }
    const isCurrentUserPartOfTeam = await hasReadPermissionsForUserId({ memberId: schedule?.userId, userId });

    const isCurrentUserOwner = schedule?.userId === userId;

    if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
      throw new Error("UNAUTHORIZED");
    }

    const timeZone = schedule.timeZone || userTimeZone;

    const schedulesCount = await this.prismaClient.schedule.count({
      where: {
        userId: userId,
      },
    });
    // disabling utc casting while fetching WorkingHours
    return {
      id: schedule.id,
      name: schedule.name,
      isManaged: schedule.userId !== userId,
      workingHours: transformWorkingHoursForAtom(schedule),
      schedule: schedule.availability,
      availability: transformAvailabilityForAtom(schedule),
      timeZone,
      dateOverrides: transformDateOverridesForAtom(schedule, timeZone),
      isDefault: !scheduleId || defaultScheduleId === schedule.id,
      isLastSchedule: schedulesCount <= 1,
      readOnly: schedule.userId !== userId && !isManagedEventType,
      userId: schedule.userId,
    };
  }

  async findManyDetailedScheduleByUserId({
    isManagedEventType,
    userId,
    defaultScheduleId,

    timeZone: userTimeZone,
  }: {
    timeZone: string;
    userId: number;
    defaultScheduleId: number | null;

    isManagedEventType?: boolean;
  }) {
    const schedules = await this.prismaClient.schedule.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        availability: true,
        timeZone: true,
      },
    });

    if (!schedules?.length) {
      throw new Error("Schedules not found");
    }

    const isCurrentUserPartOfTeam = await hasReadPermissionsForUserId({
      memberId: schedules[0].userId,
      userId,
    });

    const schedulesFormatted = schedules.map((schedule) => {
      const isCurrentUserOwner = schedule?.userId === userId;

      if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
        throw new Error("UNAUTHORIZED");
      }

      const timeZone = schedule.timeZone || userTimeZone;
      // disabling utc casting while fetching WorkingHours
      return {
        id: schedule.id,
        name: schedule.name,
        isManaged: schedule.userId !== userId,
        workingHours: transformWorkingHoursForAtom(schedule),
        schedule: schedule.availability,
        availability: transformAvailabilityForAtom(schedule),
        timeZone,
        isDefault: schedule.id === defaultScheduleId,
        dateOverrides: transformDateOverridesForAtom(schedule, timeZone),
        readOnly: schedule.userId !== userId && !isManagedEventType,
        isLastSchedule: schedules.length <= 1,
        userId: schedule.userId,
      };
    });

    return schedulesFormatted;
  }

  async getDefaultScheduleId(userId: number) {
    const user = await this.prismaClient.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        defaultScheduleId: true,
      },
    });

    if (user?.defaultScheduleId) {
      return user.defaultScheduleId;
    }

    // If we're returning the default schedule for the first time then we should set it in the user record
    const defaultSchedule = await this.prismaClient.schedule.findFirst({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!defaultSchedule) {
      // Handle case where defaultSchedule is null by throwing an error
      throw new Error("No schedules found for user");
    }

    return defaultSchedule.id;
  }

  async hasDefaultSchedule(user: Partial<User>) {
    const defaultSchedule = await this.prismaClient.schedule.findFirst({
      where: {
        userId: user.id,
      },
    });
    return !!user.defaultScheduleId || !!defaultSchedule;
  }

  async setupDefaultSchedule(userId: number, scheduleId: number) {
    return this.prismaClient.user.update({
      where: {
        id: userId,
      },
      data: {
        defaultScheduleId: scheduleId,
      },
    });
  }

  /**
   * Update blocked status for schedules by user IDs.
   * Uses chunking to avoid PostgreSQL parameter limits (~32K params).
   */
  async updateBlockedStatusByUserIds(userIds: number[], blocked: boolean): Promise<{ count: number }> {
    if (userIds.length === 0) return { count: 0 };

    const CHUNK_SIZE = 10_000; // Safe margin below PostgreSQL's ~32K param limit
    let totalCount = 0;

    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE);
      const result = await this.prismaClient.schedule.updateMany({
        where: { userId: { in: chunk } },
        data: { blockedByWatchlist: blocked },
      });
      totalCount += result.count;
    }

    return { count: totalCount };
  }

  /**
   * Update blocked status for all users matching a domain pattern using DB-side subquery.
   * Avoids materializing large user ID arrays in Node memory.
   */
  async updateBlockedStatusByDomain(domain: string, blocked: boolean): Promise<{ count: number }> {
    const pattern = `%@${domain.toLowerCase()}`;
    const result = await this.prismaClient.$executeRaw`
      UPDATE "Schedule" 
      SET "blockedByWatchlist" = ${blocked}
      WHERE "userId" IN (
        SELECT id FROM "users" WHERE LOWER(email) LIKE ${pattern}
        UNION
        SELECT "userId" FROM "SecondaryEmail" WHERE LOWER(email) LIKE ${pattern}
      )
    `;
    return { count: result };
  }

  /**
   * Update blocked status for all users matching multiple domain patterns using DB-side subquery.
   * Avoids materializing large user ID arrays in Node memory.
   */
  async updateBlockedStatusByDomains(domains: string[], blocked: boolean): Promise<{ count: number }> {
    if (domains.length === 0) return { count: 0 };

    // Build pattern array - Prisma auto-converts JS arrays to PostgreSQL arrays
    const patterns = domains.map((d) => `%@${d.toLowerCase()}`);
    const result = await this.prismaClient.$executeRaw`
      UPDATE "Schedule" 
      SET "blockedByWatchlist" = ${blocked}
      WHERE "userId" IN (
        SELECT id FROM "users" WHERE LOWER(email) LIKE ANY(${patterns}::text[])
        UNION
        SELECT "userId" FROM "SecondaryEmail" WHERE LOWER(email) LIKE ANY(${patterns}::text[])
      )
    `;
    return { count: result };
  }
}
