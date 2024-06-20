import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateScheduleInput_2024_06_11 } from "@calcom/platform-types";

type InputScheduleAvailabilityTransformed = {
  days: number[];
  startTime: Date;
  endTime: Date;
};

type InputScheduleOverrideTransformed = {
  date: Date;
  startTime: Date;
  endTime: Date;
};

type InputScheduleTransformed = Omit<CreateScheduleInput_2024_06_11, "availability" | "overrides"> & {
  availability: InputScheduleAvailabilityTransformed[];
  overrides: InputScheduleOverrideTransformed[];
};

@Injectable()
export class SchedulesRepository_2024_06_11 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createSchedule(userId: number, schedule: Omit<InputScheduleTransformed, "isDefault">) {
    const { availability, overrides } = schedule;

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

    if (availability && availability.length > 0) {
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
          date: override.date,
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

  async updateSchedule(
    userId: number,
    scheduleId: number,
    schedule: Partial<Omit<InputScheduleTransformed, "isDefault">>
  ) {
    const { availability, overrides } = schedule;

    const updateScheduleData: Prisma.ScheduleUpdateInput = {
      name: schedule.name,
      timeZone: schedule.timeZone,
    };

    const availabilitiesAndOverrides: Prisma.AvailabilityCreateManyInput[] = [];

    const deleteConditions = [];
    if (availability) {
      // note(Lauris): availabilities and overrides are stored in the same "Availability" table,
      // but availabilities have "date" field as null, while overrides have it as not null, so delete
      // condition below results in deleting only rows from Availability table that are availabilities.
      deleteConditions.push({
        scheduleId: { equals: scheduleId },
        date: null,
      });
    }

    if (overrides) {
      // note(Lauris): availabilities and overrides are stored in the same "Availability" table,
      // but overrides have "date" field as not-null, while availabilities have it as null, so delete
      // condition below results in deleting only rows from Availability table that are overrides.
      deleteConditions.push({
        scheduleId: { equals: scheduleId },
        NOT: { date: null },
      });
    }

    if (availability && availability.length > 0) {
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
          date: override.date,
          startTime: override.startTime,
          endTime: override.endTime,
          userId,
        });
      });
    }

    if (availabilitiesAndOverrides.length > 0) {
      updateScheduleData.availability = {
        deleteMany: deleteConditions,
        createMany: {
          data: availabilitiesAndOverrides,
        },
      };
    }

    const updatedSchedule = await this.dbWrite.prisma.schedule.update({
      where: {
        id: scheduleId,
      },
      data: {
        ...updateScheduleData,
      },
      include: {
        availability: true,
      },
    });

    return updatedSchedule;
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
