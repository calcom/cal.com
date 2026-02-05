import { CreateAvailabilityInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-availability.input";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesRepository_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { updateSchedule } from "@calcom/platform-libraries/schedules";
import type { UpdateScheduleInput_2024_04_15 } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";
import type { Schedule } from "@calcom/prisma/client";

@Injectable()
export class SchedulesService_2024_04_15 {
  constructor(
    private readonly schedulesRepository: SchedulesRepository_2024_04_15,
    private readonly usersRepository: UsersRepository,
    private readonly dbWrite: PrismaWriteService,
    private readonly prismaScheduleRepository: PrismaScheduleRepository
  ) {}

  async createUserDefaultSchedule(userId: number, timeZone: string) {
    const schedule = {
      isDefault: true,
      name: "Default schedule",
      timeZone,
    };

    return this.createUserSchedule(userId, schedule);
  }

  async createUserSchedule(userId: number, schedule: CreateScheduleInput_2024_04_15) {
    const availabilities = schedule.availabilities?.length
      ? schedule.availabilities
      : [this.getDefaultAvailabilityInput()];

    const createdSchedule = await this.schedulesRepository.createScheduleWithAvailabilities(
      userId,
      schedule,
      availabilities
    );

    if (schedule.isDefault) {
      await this.usersRepository.setDefaultSchedule(userId, createdSchedule.id);
    }

    const formattedSchedule = await this.getUserSchedule(userId, createdSchedule.id);

    return formattedSchedule;
  }

  async getUserScheduleDefault(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user?.defaultScheduleId) return null;
    return await this.prismaScheduleRepository.findDetailedScheduleById({
      scheduleId: user.defaultScheduleId,
      isManagedEventType: undefined,
      userId,
      timeZone: user.timeZone,
      defaultScheduleId: user.defaultScheduleId,
    });
  }

  async getUserSchedule(userId: number, scheduleId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID=${userId} does not exist.`);
    }

    const existingSchedule = await this.prismaScheduleRepository.findDetailedScheduleById({
      scheduleId: scheduleId,
      isManagedEventType: undefined,
      userId,
      timeZone: user.timeZone,
      defaultScheduleId: user.defaultScheduleId,
    });

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    return existingSchedule;
  }

  async getUserSchedules(userId: number, timeZone: string, defaultScheduleId: number | null) {
    return this.prismaScheduleRepository.findManyDetailedScheduleByUserId({
      userId,
      timeZone,
      defaultScheduleId,
    });
  }

  async updateUserSchedule(
    user: UserWithProfile,
    scheduleId: number,
    bodySchedule: UpdateScheduleInput_2024_04_15
  ) {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(user.id, existingSchedule);

    const schedule = await this.getUserSchedule(user.id, Number(scheduleId));

    if (!bodySchedule.schedule) {
      // note(Lauris): When updating an availability in cal web app, lets say only its name, also
      // the schedule is sent and then passed to the update handler. Notably, availability is passed too
      // and they have same shape, so to match shapes I attach "scheduleFormatted.availability" to reflect
      // schedule that would be passed by the web app. If we don't, then updating schedule name will erase
      // schedule.
      bodySchedule.schedule = schedule.availability;
    }

    return updateSchedule({
      input: {
        scheduleId: Number(scheduleId),
        ...bodySchedule,
      },
      user,
      prisma: this.dbWrite.prisma as unknown as PrismaClient,
    });
  }

  async deleteUserSchedule(userId: number, scheduleId: number) {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new BadRequestException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    return this.schedulesRepository.deleteScheduleById(scheduleId);
  }

  checkUserOwnsSchedule(userId: number, schedule: Pick<Schedule, "id" | "userId">) {
    if (userId !== schedule.userId) {
      throw new ForbiddenException(`User with ID=${userId} does not own schedule with ID=${schedule.id}`);
    }
  }

  getDefaultAvailabilityInput(): CreateAvailabilityInput_2024_04_15 {
    const startTime = new Date(new Date().setUTCHours(9, 0, 0, 0));
    const endTime = new Date(new Date().setUTCHours(17, 0, 0, 0));

    return {
      days: [1, 2, 3, 4, 5],
      startTime,
      endTime,
    };
  }
}
