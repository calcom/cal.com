import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { supabase } from "../../../config/supabase";
import { CreateAvailabilityInput_2024_04_15 } from "./inputs/create-availability.input";
import { CreateScheduleInput_2024_04_15 } from "./inputs/create-schedule.input";

@Injectable()
export class SchedulesRepository_2024_04_15 {
  async createScheduleWithAvailabilities(
    userId: number,
    schedule: CreateScheduleInput_2024_04_15,
    availabilities: CreateAvailabilityInput_2024_04_15[]
  ) {
    const createScheduleData = {
      availability: {},
      name: schedule.name,
      timeZone: schedule.timeZone,
      userId,
    };
    if (availabilities.length > 0) {
      createScheduleData.availability = availabilities.map((availability) => {
        return JSON.stringify({
          days: availability.days,
          startTime: availability.startTime,
          endTime: availability.endTime,
          userId,
        });
      });
    }
    const { data } = await supabase.from("Schedule").insert(createScheduleData).select("*").single();

    return data;
  }
  // TODO: PrismaReadService
  async getScheduleById(scheduleId: number) {
    // const schedule = await this.dbRead.prisma.schedule.findUnique({
    //   where: {
    //     id: scheduleId,
    //   },
    //   include: {
    //     availability: true,
    //   },
    // });
    // return schedule;
  }
  // TODO: PrismaReadService
  async getSchedulesByUserId(userId: number) {
    // const schedules = await this.dbRead.prisma.schedule.findMany({
    //   where: {
    //     userId,
    //   },
    //   include: {
    //     availability: true,
    //   },
    // });
    // return schedules;
  }
  // TODO: PrismaWriteService
  async deleteScheduleById(scheduleId: number) {
    // return this.dbWrite.prisma.schedule.delete({
    //   where: {
    //     id: scheduleId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async getUserSchedulesCount(userId: number) {
    // return this.dbRead.prisma.schedule.count({
    //   where: {
    //     userId,
    //   },
    // });
  }
}
