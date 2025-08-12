import { CreateAvailabilityInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-availability.input";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@calcom/prisma/client";


@Injectable()
export class SchedulesRepository_2024_04_15 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createScheduleWithAvailabilities(
    userId: number,
    schedule: CreateScheduleInput_2024_04_15,
    availabilities: CreateAvailabilityInput_2024_04_15[]
  ) {
    const createScheduleData: Prisma.ScheduleCreateInput = {
      user: {
        connect: {
          id: userId,
        },
      },
      name: schedule.name,
      timeZone: schedule.timeZone,
    };

    if (availabilities.length > 0) {
      createScheduleData.availability = {
        createMany: {
          data: availabilities.map((availability) => {
            return {
              days: availability.days,
              startTime: availability.startTime,
              endTime: availability.endTime,
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
