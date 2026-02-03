import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";
import {
  transformAvailabilityForAtom,
  transformDateOverridesForAtom,
  transformWorkingHoursForAtom,
} from "@calcom/lib/schedules/transformers";
import type { PrismaClient } from "@calcom/prisma";
import type { Availability, User } from "@calcom/prisma/client";
import type { JsonValue } from "type-fest";

export type FindDetailedScheduleByIdReturnType = Awaited<
  ReturnType<ScheduleRepository["findDetailedScheduleById"]>
>;

interface ScheduleWithAvailability {
  id: number;
  name: string;
  userId: number;
  timeZone: string | null;
  availability: Availability[];
}

interface DetailedScheduleResult {
  id: number;
  name: string;
  isManaged: boolean;
  workingHours: ReturnType<typeof transformWorkingHoursForAtom>;
  schedule: Availability[];
  availability: ReturnType<typeof transformAvailabilityForAtom>;
  timeZone: string;
  dateOverrides: ReturnType<typeof transformDateOverridesForAtom>;
  isDefault: boolean;
  isLastSchedule: boolean;
  readOnly: boolean;
  userId: number;
  syncSource?: string | null;
  syncLastAt?: Date | null;
  syncError?: string | null;
  syncConfig?: JsonValue | null;
}

interface FindScheduleByIdForBuildDateRangesResult {
  id: number;
  timeZone: string | null;
  userId: number;
  availability: { days: number[]; startTime: Date; endTime: Date; date: Date | null }[];
  user: {
    id: number;
    defaultScheduleId: number | null;
    travelSchedules: { id: number; timeZone: string; startDate: Date; endDate: Date | null }[];
  } | null;
}

export class ScheduleRepository {
  constructor(private readonly prismaClient: PrismaClient) {
    if (!prismaClient) {
      throw new Error("PrismaClient is required for ScheduleRepository");
    }
  }

  async findScheduleByIdForBuildDateRanges({
    scheduleId,
  }: {
    scheduleId: number;
  }): Promise<FindScheduleByIdForBuildDateRangesResult | null> {
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

  async findScheduleByIdForOwnershipCheck({
    scheduleId,
  }: {
    scheduleId: number;
  }): Promise<{ userId: number } | null> {
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

  async findScheduleById({ id }: { id: number }): Promise<{
    id: number;
    userId: number;
    name: string;
    availability: Availability[];
    timeZone: string | null;
  } | null> {
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

  private formatDetailedSchedule(
    schedule: ScheduleWithAvailability & {
      syncSource?: string | null;
      syncLastAt?: Date | null;
      syncError?: string | null;
      syncConfig?: JsonValue | null;
    },
    params: {
      userId: number;
      defaultScheduleId: number | null;
      userTimeZone: string;
      scheduleId?: number;
      isManagedEventType?: boolean;
      schedulesCount: number;
    }
  ): DetailedScheduleResult {
    const { userId, defaultScheduleId, userTimeZone, scheduleId, isManagedEventType, schedulesCount } = params;
    const timeZone = schedule.timeZone || userTimeZone;
    const isSynced = !!schedule.syncSource;

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
      readOnly: (schedule.userId !== userId && !isManagedEventType) || isSynced,
      userId: schedule.userId,
      syncSource: schedule.syncSource,
      syncLastAt: schedule.syncLastAt,
      syncError: schedule.syncError,
      syncConfig: schedule.syncConfig,
    };
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
  }): Promise<DetailedScheduleResult> {
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
        syncSource: true,
        syncLastAt: true,
        syncError: true,
        syncConfig: true,
      },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    const isCurrentUserPartOfTeam = await hasReadPermissionsForUserId({ memberId: schedule.userId, userId });
    const isCurrentUserOwner = schedule.userId === userId;

    if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
      throw new Error("UNAUTHORIZED");
    }

    const schedulesCount = await this.prismaClient.schedule.count({ where: { userId } });

    return this.formatDetailedSchedule(schedule, {
      userId,
      defaultScheduleId,
      userTimeZone,
      scheduleId,
      isManagedEventType,
      schedulesCount,
    });
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
  }): Promise<Omit<DetailedScheduleResult, "syncLastAt" | "syncError" | "syncConfig">[]> {
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
        syncSource: true,
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
      const isCurrentUserOwner = schedule.userId === userId;

      if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
        throw new Error("UNAUTHORIZED");
      }

      const timeZone = schedule.timeZone || userTimeZone;
      const isSynced = !!schedule.syncSource;

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
        readOnly: (schedule.userId !== userId && !isManagedEventType) || isSynced,
        isLastSchedule: schedules.length <= 1,
        userId: schedule.userId,
        syncSource: schedule.syncSource,
      };
    });

    return schedulesFormatted;
  }

  async getDefaultScheduleId(userId: number): Promise<number> {
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

    const defaultSchedule = await this.prismaClient.schedule.findFirst({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!defaultSchedule) {
      throw new Error("No schedules found for user");
    }

    return defaultSchedule.id;
  }

  async hasDefaultSchedule(user: Partial<User>): Promise<boolean> {
    const defaultSchedule = await this.prismaClient.schedule.findFirst({
      where: {
        userId: user.id,
      },
    });
    return !!user.defaultScheduleId || !!defaultSchedule;
  }

  async setupDefaultSchedule(userId: number, scheduleId: number): Promise<User> {
    return this.prismaClient.user.update({
      where: {
        id: userId,
      },
      data: {
        defaultScheduleId: scheduleId,
      },
    });
  }
}
