
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import type { Prisma } from "@prisma/client";

import { ScheduleRepository } from "@/repositories/schedule.repository";

import { PrismaClient } from "@calcom/prisma";

import { BaseService } from "../base.service";

export class ScheduleService extends BaseService {
  private scheduleRepository: ScheduleRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.scheduleRepository = new ScheduleRepository(prisma);
  }

  async findByUserId(userId: number) {
    try {
      const data = this.scheduleRepository.findByUserId(userId);
      return data
    } catch (error) {
      this.logError("getUserById", error);
      throw error;
    }
  }

  async create(body : {
    timeZone?: string,
    name: string
  }, userId: number) {
    let args: Prisma.ScheduleCreateArgs = { data: { ...body, userId } };

    // We create default availabilities for the schedule
    args.data.availability = {
      createMany: {
        data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE).map((schedule) => ({
          days: schedule.days,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        })),
      },
    };
    // We include the recently created availability
    args.include = { availability: true };
    const data = this.scheduleRepository.createSchedule(args);
    return data;
  }

  async update(body : {
    timeZone?: string,
    name: string
  }, userId: number, scheduleId: number) {
    const data = this.scheduleRepository.updateSchedule(body, userId, scheduleId);
    return data;
  }


  async delete(scheduleId: number) {
    this.scheduleRepository.detachDefaultScheduleFromUsers(scheduleId);
    return this.scheduleRepository.deleteSchedule(scheduleId);
  }


}