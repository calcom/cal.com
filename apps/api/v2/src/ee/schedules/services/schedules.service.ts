import { CreateScheduleInput, WeekDay } from "@/ee/schedules/inputs/create-schedule.input";
import { ScheduleOutput } from "@/ee/schedules/outputs/schedule.output";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { AvailabilitiesService } from "@/modules/availabilities/availabilities.service";
import { ScheduleAvailability } from "@/modules/availabilities/types/schedule-availability";
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

export type ScheduleTransformed = Omit<CreateScheduleInput, "availability"> & {
  availability: ScheduleAvailability[];
};

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

  async createUserSchedule(userId: number, scheduleInput: CreateScheduleInput): Promise<ScheduleOutput> {
    const schedule = this.transformCreateScheduleInputForInternalUse(scheduleInput);

    const createdSchedule = await this.schedulesRepository.createScheduleWithAvailability(userId, schedule);

    if (schedule.isDefault) {
      await this.usersRepository.setDefaultSchedule(userId, createdSchedule.id);
    }

    if (!createdSchedule.timeZone) {
      throw new Error("Failed to create schedule because its timezone is not set.");
    }

    return {
      id: createdSchedule.id,
      name: createdSchedule.name,
      timeZone: createdSchedule.timeZone,
      availability: createdSchedule.availability.map((availability) => ({
        days: availability.days.map(transformNumberToDay),
        startTime: availability.startTime.getHours() + ":" + availability.startTime.getMinutes(),
        endTime: availability.endTime.getHours() + ":" + availability.endTime.getMinutes(),
      })),
      isDefault: schedule.isDefault,
      overrides: schedule.overrides || [],
    };
  }

  transformCreateScheduleInputForInternalUse(schedule: CreateScheduleInput): ScheduleTransformed {
    const availability = this.transformCreateScheduleAvailabilityForInternalUse(schedule);

    const transformedSchedule = {
      ...schedule,
      availability,
    };

    return transformedSchedule;
  }

  transformCreateScheduleAvailabilityForInternalUse(schedule: CreateScheduleInput): ScheduleAvailability[] {
    if (schedule.availability) {
      return schedule.availability.map((availability) => ({
        days: availability.days.map(transformDayToNumber),
        startTime: availability.startTime,
        endTime: availability.endTime,
      }));
    }

    return [this.availabilitiesService.getDefaultAvailabilityInput()];
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

  async formatScheduleForAtom(user: User, schedule: ScheduleWithAvailabilities) {
    const usersSchedulesCount = await this.schedulesRepository.getUserSchedulesCount(user.id);
    return this.transformScheduleForAtom(schedule, usersSchedulesCount, user);
  }

  async formatSchedulesForAtom(user: User, schedules: ScheduleWithAvailabilities[]) {
    const usersSchedulesCount = await this.schedulesRepository.getUserSchedulesCount(user.id);
    return Promise.all(
      schedules.map((schedule) => this.transformScheduleForAtom(schedule, usersSchedulesCount, user))
    );
  }

  async transformScheduleForAtom(
    schedule: ScheduleWithAvailabilities,
    userSchedulesCount: number,
    user: Pick<User, "id" | "defaultScheduleId" | "timeZone">
  ) {
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

function transformDayToNumber(day: WeekDay): number {
  const weekMap: { [key in WeekDay]: number } = {
    [WeekDay.Sunday]: 0,
    [WeekDay.Monday]: 1,
    [WeekDay.Tuesday]: 2,
    [WeekDay.Wednesday]: 3,
    [WeekDay.Thursday]: 4,
    [WeekDay.Friday]: 5,
    [WeekDay.Saturday]: 6,
  };
  return weekMap[day];
}

function transformNumberToDay(day: number): WeekDay {
  const weekMap: { [key: number]: WeekDay } = {
    0: WeekDay.Sunday,
    1: WeekDay.Monday,
    2: WeekDay.Tuesday,
    3: WeekDay.Wednesday,
    4: WeekDay.Thursday,
    5: WeekDay.Friday,
    6: WeekDay.Saturday,
  };
  return weekMap[day];
}
