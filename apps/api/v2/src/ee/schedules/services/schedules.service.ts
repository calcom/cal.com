import { CreateScheduleInput } from "@/ee/schedules/inputs/create-schedule.input";
import { ScheduleOutput } from "@/ee/schedules/outputs/schedule.output";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { AvailabilitiesService } from "@/modules/availabilities/availabilities.service";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Schedule } from "@prisma/client";
import { User } from "@prisma/client";

import type { ScheduleWithAvailabilities } from "@calcom/platform-libraries";
import { updateScheduleHandler } from "@calcom/platform-libraries";
import {
  transformWorkingHoursForClient,
  transformAvailabilityForClient,
  transformDateOverridesForClient,
} from "@calcom/platform-libraries";
import { UpdateScheduleInput } from "@calcom/platform-types";

@Injectable()
export class SchedulesService {
  constructor(
    private readonly schedulesRepository: SchedulesRepository,
    private readonly availabilitiesService: AvailabilitiesService,
    private readonly usersRepository: UsersRepository
  ) {}

  async createUserDefaultSchedule(userId: number, timeZone: string) {
    const schedule = {
      isDefault: true,
      name: "Default schedule",
      timeZone,
    };

    return this.createUserSchedule(userId, schedule);
  }

  async createUserSchedule(userId: number, schedule: CreateScheduleInput) {
    const availabilities = schedule.availabilities?.length
      ? schedule.availabilities
      : [this.availabilitiesService.getDefaultAvailabilityInput()];

    const createdSchedule = await this.schedulesRepository.createScheduleWithAvailabilities(
      userId,
      schedule,
      availabilities
    );

    if (schedule.isDefault) {
      await this.usersRepository.setDefaultSchedule(userId, createdSchedule.id);
    }

    return createdSchedule;
  }

  async getUserScheduleDefault(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user?.defaultScheduleId) return null;

    return this.schedulesRepository.getScheduleById(user.defaultScheduleId);
  }

  async getUserSchedule(userId: number, scheduleId: number) {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    return existingSchedule;
  }

  async getUserSchedules(userId: number) {
    return this.schedulesRepository.getSchedulesByUserId(userId);
  }

  async updateUserSchedule(user: UserWithProfile, scheduleId: number, bodySchedule: UpdateScheduleInput) {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(user.id, existingSchedule);

    const schedule = await this.getUserSchedule(user.id, Number(scheduleId));
    const scheduleFormatted = await this.formatScheduleForAtom(user, schedule);

    if (!bodySchedule.schedule) {
      // note(Lauris): When updating an availability in cal web app, lets say only its name, also
      // the schedule is sent and then passed to the update handler. Notably, availability is passed too
      // and they have same shape, so to match shapes I attach "scheduleFormatted.availability" to reflect
      // schedule that would be passed by the web app. If we don't, then updating schedule name will erase
      // schedule.
      bodySchedule.schedule = scheduleFormatted.availability;
    }

    return updateScheduleHandler({
      input: { scheduleId: Number(scheduleId), ...bodySchedule },
      ctx: { user },
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

  async formatScheduleForAtom(user: User, schedule: ScheduleWithAvailabilities): Promise<ScheduleOutput> {
    const usersSchedulesCount = await this.schedulesRepository.getUserSchedulesCount(user.id);
    return this.transformScheduleForAtom(schedule, usersSchedulesCount, user);
  }

  async formatSchedulesForAtom(
    user: User,
    schedules: ScheduleWithAvailabilities[]
  ): Promise<ScheduleOutput[]> {
    const usersSchedulesCount = await this.schedulesRepository.getUserSchedulesCount(user.id);
    return Promise.all(
      schedules.map((schedule) => this.transformScheduleForAtom(schedule, usersSchedulesCount, user))
    );
  }

  async transformScheduleForAtom(
    schedule: ScheduleWithAvailabilities,
    userSchedulesCount: number,
    user: Pick<User, "id" | "defaultScheduleId" | "timeZone">
  ): Promise<ScheduleOutput> {
    const timeZone = schedule.timeZone || user.timeZone;
    const defaultSchedule = await this.getUserScheduleDefault(user.id);

    return {
      id: schedule.id,
      name: schedule.name,
      isManaged: schedule.userId !== user.id,
      workingHours: transformWorkingHoursForClient(schedule),
      schedule: schedule.availability,
      availability: transformAvailabilityForClient(schedule),
      timeZone,
      dateOverrides: transformDateOverridesForClient(schedule, timeZone),
      isDefault: defaultSchedule?.id === schedule.id,
      isLastSchedule: userSchedulesCount <= 1,
      readOnly: schedule.userId !== user.id,
    };
  }

  checkUserOwnsSchedule(userId: number, schedule: Pick<Schedule, "id" | "userId">) {
    if (userId !== schedule.userId) {
      throw new ForbiddenException(`User with ID=${userId} does not own schedule with ID=${schedule.id}`);
    }
  }
}
