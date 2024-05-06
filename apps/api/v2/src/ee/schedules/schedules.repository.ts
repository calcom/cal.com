import { CreateScheduleTransformed } from "@/ee/schedules/services/schedules.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class SchedulesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createSchedule(userId: number, schedule: CreateScheduleTransformed) {
    const availability = schedule.availability;
    const overrides = schedule.overrides;

    const createScheduleData: Prisma.ScheduleCreateInput = {
      user: {
        connect: {
          id: userId,
        },
      },
      name: schedule.name,
      timeZone: schedule.timeZone,
    };

    const availabilitiesAndOverrides: Prisma.AvailabilityCreateManyInput[] = [];

    if (availability.length > 0) {
      availability.forEach((availability) => {
        availabilitiesAndOverrides.push({
          days: availability.days,
          startTime: availability.startTime,
          endTime: availability.endTime,
          userId,
        });
      });
    }

    if (overrides && overrides.length > 0) {
      overrides.forEach((override) => {
        availabilitiesAndOverrides.push({
          date: new Date(override.date),
          startTime: override.startTime,
          endTime: override.endTime,
          userId,
        });
      });
    }

    if (availabilitiesAndOverrides.length > 0) {
      createScheduleData.availability = {
        createMany: {
          data: availabilitiesAndOverrides,
        },
      };
    }

    const createdSchedule = await this.dbWrite.prisma.schedule.create({
      data: {
        ...createScheduleData,
      },
      include: {
        availability: true,
      },
    });

    return createdSchedule;
  }

  async getScheduleById(scheduleId: number) {
    const schedule = await this.dbRead.prisma.schedule.findUnique({
      where: {
        id: scheduleId,
      },
      include: {
        availability: true,
      },
    });

    return schedule;
  }

  async getSchedulesByUserId(userId: number) {
    const schedules = await this.dbRead.prisma.schedule.findMany({
      where: {
        userId,
      },
      include: {
        availability: true,
      },
    });

    return schedules;
  }

  async deleteScheduleById(scheduleId: number) {
    return this.dbWrite.prisma.schedule.delete({
      where: {
        id: scheduleId,
      },
    });
  }

  async getUserSchedulesCount(userId: number) {
    return this.dbRead.prisma.schedule.count({
      where: {
        userId,
      },
    });
  }
}
