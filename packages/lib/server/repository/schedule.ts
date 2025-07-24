import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";

import { hasReadPermissionsForUserId } from "../../hasEditPermissionForUser";
import {
  transformAvailabilityForAtom,
  transformDateOverridesForAtom,
  transformWorkingHoursForAtom,
} from "../../schedules/transformers";

export type FindDetailedScheduleByIdReturnType = Awaited<
  ReturnType<typeof ScheduleRepository.findDetailedScheduleById>
>;

export class ScheduleRepository {
  // when instantiating, prismaClient injection is required
  constructor(private prismaClient: PrismaClient) {}

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

  static async findScheduleById({ id }: { id: number }) {
    const schedule = await prisma.schedule.findUnique({
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

  static async findDetailedScheduleById({
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
    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId || (await getDefaultScheduleId(userId, prisma)),
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
    const isCurrentUserPartOfTeam = hasReadPermissionsForUserId({ memberId: schedule?.userId, userId });

    const isCurrentUserOwner = schedule?.userId === userId;

    if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
      throw new Error("UNAUTHORIZED");
    }

    const timeZone = schedule.timeZone || userTimeZone;

    const schedulesCount = await prisma.schedule.count({
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

  static async findManyDetailedScheduleByUserId({
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
    const schedules = await prisma.schedule.findMany({
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
}
