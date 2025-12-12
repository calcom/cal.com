import type { User } from "@calcom/prisma/client";

import type { KyselyDb } from "@calcom/kysely/repository";

import type {
  AvailabilityDto,
  ScheduleBasicDto,
  ScheduleForBuildDateRangesDto,
  ScheduleForOwnershipCheckDto,
  UserDefaultScheduleDto,
} from "./dto/ScheduleDto";
import type { IScheduleRepository } from "./IScheduleRepository";

export class KyselyScheduleRepository implements IScheduleRepository {
  constructor(
    private readonly readDb: KyselyDb,
    private readonly writeDb: KyselyDb
  ) {
    if (!readDb || !writeDb) {
      throw new Error("Kysely database instances are required for KyselyScheduleRepository");
    }
  }

  async findByIdForBuildDateRanges(args: {
    scheduleId: number;
  }): Promise<ScheduleForBuildDateRangesDto | null> {
    const { scheduleId } = args;

    const schedule = await this.readDb
      .selectFrom("Schedule")
      .select(["id", "timeZone", "userId"])
      .where("id", "=", scheduleId)
      .executeTakeFirst();

    if (!schedule) {
      return null;
    }

    const availability = await this.readDb
      .selectFrom("Availability")
      .select(["days", "startTime", "endTime", "date"])
      .where("scheduleId", "=", scheduleId)
      .execute();

    const user = await this.readDb
      .selectFrom("users")
      .select(["id", "defaultScheduleId"])
      .where("id", "=", schedule.userId)
      .executeTakeFirst();

    if (!user) {
      return null;
    }

    const travelSchedules = await this.readDb
      .selectFrom("TravelSchedule")
      .select(["id", "timeZone", "startDate", "endDate"])
      .where("userId", "=", schedule.userId)
      .execute();

    return {
      id: schedule.id,
      timeZone: schedule.timeZone,
      userId: schedule.userId,
      availability: availability.map((a) => ({
        days: a.days,
        startTime: a.startTime,
        endTime: a.endTime,
        date: a.date,
      })),
      user: {
        id: user.id,
        defaultScheduleId: user.defaultScheduleId,
        travelSchedules: travelSchedules.map((ts) => ({
          id: ts.id,
          timeZone: ts.timeZone,
          startDate: ts.startDate,
          endDate: ts.endDate,
        })),
      },
    };
  }

  async findByIdForOwnershipCheck(args: {
    scheduleId: number;
  }): Promise<ScheduleForOwnershipCheckDto | null> {
    const { scheduleId } = args;

    const schedule = await this.readDb
      .selectFrom("Schedule")
      .select(["userId"])
      .where("id", "=", scheduleId)
      .executeTakeFirst();

    if (!schedule) {
      return null;
    }

    return {
      userId: schedule.userId,
    };
  }

  async findById(args: { id: number }): Promise<ScheduleBasicDto | null> {
    const { id } = args;

    const schedule = await this.readDb
      .selectFrom("Schedule")
      .select(["id", "userId", "name", "timeZone"])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!schedule) {
      return null;
    }

    const availability = await this.readDb
      .selectFrom("Availability")
      .select(["id", "userId", "eventTypeId", "days", "startTime", "endTime", "date", "scheduleId"])
      .where("scheduleId", "=", id)
      .execute();

    return {
      id: schedule.id,
      userId: schedule.userId,
      name: schedule.name,
      timeZone: schedule.timeZone,
      availability: availability.map((a): AvailabilityDto => ({
        id: a.id,
        userId: a.userId,
        eventTypeId: a.eventTypeId,
        days: a.days,
        startTime: a.startTime,
        endTime: a.endTime,
        date: a.date,
        scheduleId: a.scheduleId,
      })),
    };
  }

  async getDefaultScheduleId(userId: number): Promise<number> {
    const user = await this.readDb
      .selectFrom("users")
      .select(["defaultScheduleId"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (user?.defaultScheduleId) {
      return user.defaultScheduleId;
    }

    const defaultSchedule = await this.readDb
      .selectFrom("Schedule")
      .select(["id"])
      .where("userId", "=", userId)
      .orderBy("id", "asc")
      .executeTakeFirst();

    if (!defaultSchedule) {
      throw new Error("No schedules found for user");
    }

    return defaultSchedule.id;
  }

  async hasDefaultSchedule(user: Partial<User>): Promise<boolean> {
    if (user.defaultScheduleId) {
      return true;
    }

    if (!user.id) {
      return false;
    }

    const defaultSchedule = await this.readDb
      .selectFrom("Schedule")
      .select(["id"])
      .where("userId", "=", user.id)
      .executeTakeFirst();

    return !!defaultSchedule;
  }

  async setupDefaultSchedule(userId: number, scheduleId: number): Promise<UserDefaultScheduleDto> {
    await this.writeDb
      .updateTable("users")
      .set({ defaultScheduleId: scheduleId })
      .where("id", "=", userId)
      .execute();

    return {
      defaultScheduleId: scheduleId,
    };
  }

  async countByUserId(userId: number): Promise<number> {
    const result = await this.readDb
      .selectFrom("Schedule")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirst();

    return result?.count ?? 0;
  }
}
