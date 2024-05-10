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
import { CreateScheduleInput, ScheduleOutput } from "@calcom/platform-types";
import { ScheduleOverride, UpdateScheduleInput } from "@calcom/platform-types";
import { WeekDay } from "@calcom/platform-types";

export type CreateScheduleTransformed = Omit<CreateScheduleInput, "availability"> & {
  availability: ScheduleAvailability[];
};

type UpdateScheduleTransformed = Partial<
  Omit<CreateScheduleInput, "availability"> & {
    availability: ScheduleAvailability[];
  }
>;

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

    const createdSchedule = await this.schedulesRepository.createSchedule(userId, schedule);

    if (schedule.isDefault) {
      await this.usersRepository.setDefaultSchedule(userId, createdSchedule.id);
    }

    return this.getResponseSchedule(createdSchedule);
  }

  transformCreateScheduleInputForInternalUse(schedule: CreateScheduleInput): CreateScheduleTransformed {
    const availability = this.transformInputScheduleAvailabilityForInternalUse(schedule);

    const transformedSchedule = {
      ...schedule,
      availability,
    };

    return transformedSchedule;
  }

  transformUpdateScheduleInputForInternalUse(schedule: UpdateScheduleInput): UpdateScheduleTransformed {
    const availability = this.transformInputScheduleAvailabilityForInternalUse(schedule);

    const transformedSchedule = {
      ...schedule,
      availability,
    };

    return transformedSchedule;
  }

  transformInputScheduleAvailabilityForInternalUse(
    schedule: CreateScheduleInput | UpdateScheduleInput
  ): ScheduleAvailability[] {
    if (schedule.availability) {
      return schedule.availability.map((availability) => ({
        days: availability.days.map(transformDayToNumber),
        startTime: this.createDateFromHoursMinutes(availability.startTime),
        endTime: this.createDateFromHoursMinutes(availability.endTime),
      }));
    }

    return [this.availabilitiesService.getDefaultAvailabilityInput()];
  }

  createDateFromHoursMinutes(hoursMinutes: string): Date {
    const parts = hoursMinutes.split(":");

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

  async getResponseSchedule(fetchedSchedule: ScheduleWithAvailabilities) {
    if (!fetchedSchedule.timeZone) {
      throw new Error("Failed to create schedule because its timezone is not set.");
    }

    const ownerDefaultScheduleId = await this.getUserScheduleDefaultId(fetchedSchedule.userId);

    const createdScheduleAvailabilities = fetchedSchedule.availability.filter(
      (availability) => !!availability.days.length
    );
    const createdScheduleOverrides = fetchedSchedule.availability.filter(
      (availability) => !availability.days.length
    );

    return {
      id: fetchedSchedule.id,
      ownerId: fetchedSchedule.userId,
      name: fetchedSchedule.name,
      timeZone: fetchedSchedule.timeZone,
      availability: createdScheduleAvailabilities.map((availability) => ({
        days: availability.days.map(transformNumberToDay),
        startTime: this.padHoursMinutesWithZeros(
          availability.startTime.getUTCHours() + ":" + availability.startTime.getUTCMinutes()
        ),
        endTime: this.padHoursMinutesWithZeros(
          availability.endTime.getUTCHours() + ":" + availability.endTime.getUTCMinutes()
        ),
      })),
      isDefault: fetchedSchedule.id === ownerDefaultScheduleId,
      overrides: createdScheduleOverrides.map((availability) => ({
        date:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          availability.date!.getUTCFullYear() +
          "-" +
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (availability.date!.getUTCMonth() + 1).toString().padStart(2, "0") +
          "-" +
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          availability.date!.getUTCDate().toString().padStart(2, "0"),
        startTime: this.padHoursMinutesWithZeros(
          availability.startTime.getUTCHours() + ":" + availability.startTime.getUTCMinutes()
        ),
        endTime: this.padHoursMinutesWithZeros(
          availability.endTime.getUTCHours() + ":" + availability.endTime.getUTCMinutes()
        ),
      })),
    };
  }

  padHoursMinutesWithZeros(hhMM: string) {
    const [hours, minutes] = hhMM.split(":");

    const formattedHours = hours.padStart(2, "0");
    const formattedMinutes = minutes.padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}`;
  }

  async getUserScheduleDefault(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user?.defaultScheduleId) return null;

    const defaultSchedule = await this.schedulesRepository.getScheduleById(user.defaultScheduleId);

    if (!defaultSchedule) return null;
    return this.getResponseSchedule(defaultSchedule);
  }

  async getUserScheduleDefaultId(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user?.defaultScheduleId) return null;

    const defaultSchedule = await this.schedulesRepository.getScheduleById(user.defaultScheduleId);
    if (!defaultSchedule) return null;

    return defaultSchedule.id;
  }

  async getUserSchedule(userId: number, scheduleId: number) {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    return this.getResponseSchedule(existingSchedule);
  }

  async getUserSchedules(userId: number) {
    const schedules = await this.schedulesRepository.getSchedulesByUserId(userId);
    return Promise.all(
      schedules.map(async (schedule) => {
        return this.getResponseSchedule(schedule);
      })
    );
  }

  async updateUserSchedule(user: UserWithProfile, scheduleId: number, bodySchedule: UpdateScheduleInput) {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(user.id, existingSchedule);

    const schedule = this.transformUpdateScheduleInputForInternalUse(bodySchedule);

    const handlerSchedule = {
      scheduleId,
      timeZone: bodySchedule.timeZone || existingSchedule.timeZone || undefined,
      name: bodySchedule.name || existingSchedule.name,
      isDefault: bodySchedule.isDefault || user.defaultScheduleId === scheduleId,
      schedule: transformAvailabilityForClient(
        schedule.availability ? { availability: schedule.availability } : { availability: [] }
      ),
      dateOverrides: this.convertOverridesToDateOverrides(schedule.overrides || []),
    };

    await updateScheduleHandler({
      input: handlerSchedule,
      ctx: { user },
    });

    return this.getUserSchedule(user.id, scheduleId);
  }

  convertOverridesToDateOverrides(overrides: ScheduleOverride[]) {
    return overrides.map((override) => {
      const date = new Date(override.date);
      const start = this.convertTimeToDate(date, override.startTime);
      const end = this.convertTimeToDate(date, override.endTime);
      return { start, end };
    });
  }

  convertTimeToDate(baseDate: Date, time: string): Date {
    const [hours, minutes] = time.split(":").map(Number);
    const newDate = new Date(baseDate);
    newDate.setUTCHours(hours, minutes, 0, 0);
    return newDate;
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
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return weekMap[day];
}

function transformNumberToDay(day: number): WeekDay {
  const weekMap: { [key: number]: WeekDay } = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return weekMap[day];
}
