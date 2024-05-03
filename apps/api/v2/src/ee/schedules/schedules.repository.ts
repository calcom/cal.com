import { ScheduleTransformed } from "@/ee/schedules/services/schedules.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class SchedulesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createScheduleWithAvailability(userId: number, schedule: ScheduleTransformed) {
    const availability = schedule.availability;
    const createScheduleData: Prisma.ScheduleCreateInput = {
      user: {
        connect: {
          id: userId,
        },
      },
      name: schedule.name,
      timeZone: schedule.timeZone,
    };

    if (availability.length > 0) {
      createScheduleData.availability = {
        createMany: {
          data: availability.map((availability) => {
            return {
              days: availability.days,
              startTime: this.createDateFromTimeString(availability.startTime),
              endTime: this.createDateFromTimeString(availability.endTime),
              userId,
            };
          }),
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

  createDateFromTimeString(timeString: string): Date {
    const parts = timeString.split(":");

    if (parts.length < 2) {
      throw new Error("Invalid time format. Please use 'hh:mm'.");
    }

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || hours < 0 || hours > 23) {
      throw new Error("Hours must be a number between 0 and 23.");
    }
    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
      throw new Error("Minutes must be a number between 0 and 59.");
    }

    const today = new Date();

    const utcDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hours, minutes)
    );

    return utcDate;
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
