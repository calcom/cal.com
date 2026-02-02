import type {
  CreateScheduleInput_2024_06_11,
  ScheduleOutput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
} from "@calcom/platform-types";
import type { Schedule } from "@calcom/prisma/client";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { InputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/input-schedules.service";
import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class SchedulesService_2024_06_11 {
  constructor(
    private readonly schedulesRepository: SchedulesRepository_2024_06_11,
    private readonly inputSchedulesService: InputSchedulesService_2024_06_11,
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11,
    private readonly usersRepository: UsersRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14
  ) {}

  async createUserDefaultSchedule(userId: number, timeZone: string): Promise<ScheduleOutput_2024_06_11> {
    const defaultSchedule = {
      isDefault: true,
      name: "Default schedule",
      timeZone,
    };

    return this.createUserSchedule(userId, defaultSchedule);
  }

  async createUserSchedule(
    userId: number,
    scheduleInput: CreateScheduleInput_2024_06_11
  ): Promise<ScheduleOutput_2024_06_11> {
    const schedule = this.inputSchedulesService.transformInputCreateSchedule(scheduleInput);

    const createdSchedule = await this.schedulesRepository.createSchedule(userId, schedule);

    if (schedule.isDefault) {
      await this.usersRepository.setDefaultSchedule(userId, createdSchedule.id);
    }

    return this.outputSchedulesService.getResponseSchedule(createdSchedule);
  }

  async getUserScheduleDefault(userId: number): Promise<ScheduleOutput_2024_06_11 | null> {
    const user = await this.usersRepository.findById(userId);

    if (!user?.defaultScheduleId) return null;

    const defaultSchedule = await this.schedulesRepository.getScheduleById(user.defaultScheduleId);

    if (!defaultSchedule) return null;
    return this.outputSchedulesService.getResponseSchedule(defaultSchedule);
  }

  async getUserSchedule(userId: number, scheduleId: number): Promise<ScheduleOutput_2024_06_11> {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    return this.outputSchedulesService.getResponseSchedule(existingSchedule);
  }

  async getUserSchedules(userId: number, eventTypeId?: number): Promise<ScheduleOutput_2024_06_11[]> {
    if (!eventTypeId) {
      const schedules = await this.schedulesRepository.getSchedulesByUserId(userId);
      return Promise.all(
        schedules.map(async (schedule) => {
          return this.outputSchedulesService.getResponseSchedule(schedule);
        })
      );
    }

    return this.getUserSchedulesForEventType(userId, eventTypeId);
  }

  private async getUserSchedulesForEventType(
    userId: number,
    eventTypeId: number
  ): Promise<ScheduleOutput_2024_06_11[]> {
    const userEventType = await this.eventTypesRepository.getUserEventType(userId, eventTypeId);

    let effectiveScheduleId: number | null = null;

    if (userEventType) {
      const user = await this.usersRepository.findById(userId);
      effectiveScheduleId = userEventType.scheduleId ?? user?.defaultScheduleId ?? null;
    } else {
      // if its not a user owned event type, check if it's a team event type where user one of the host
      const eventType = await this.eventTypesRepository.getEventTypeByIdWithHosts(eventTypeId);

      if (!eventType) {
        throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
      }

      const userHost = eventType.hosts?.find((host) => host.userId === userId);

      if (!userHost) {
        throw new NotFoundException(`User ${userId} is not associated with event type ${eventTypeId}`);
      }

      const user = await this.usersRepository.findById(userId);

      effectiveScheduleId = eventType.scheduleId ?? userHost.scheduleId ?? user?.defaultScheduleId ?? null;
    }

    if (!effectiveScheduleId) {
      return [];
    }

    const schedule = await this.schedulesRepository.getScheduleById(effectiveScheduleId);

    if (!schedule) {
      return [];
    }

    if (schedule.userId !== userId) {
      throw new ForbiddenException(`User ${userId} does not have access to schedule ${effectiveScheduleId}`);
    }

    return [await this.outputSchedulesService.getResponseSchedule(schedule)];
  }

  async updateUserSchedule(
    userId: number,
    scheduleId: number,
    bodySchedule: UpdateScheduleInput_2024_06_11
  ): Promise<ScheduleOutput_2024_06_11> {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    const availability = bodySchedule.availability
      ? this.inputSchedulesService.transformInputScheduleAvailability(bodySchedule.availability)
      : undefined;
    const overrides = bodySchedule.overrides
      ? this.inputSchedulesService.transformInputOverrides(bodySchedule.overrides)
      : undefined;

    if (bodySchedule.isDefault) {
      await this.usersRepository.setDefaultSchedule(userId, scheduleId);
    }

    const updatedSchedule = await this.schedulesRepository.updateSchedule(userId, scheduleId, {
      ...bodySchedule,
      availability,
      overrides,
    });

    return this.outputSchedulesService.getResponseSchedule(updatedSchedule);
  }

  async deleteUserSchedule(userId: number, scheduleId: number): Promise<Schedule> {
    const existingSchedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (!existingSchedule) {
      throw new BadRequestException(`Schedule with ID=${scheduleId} does not exist.`);
    }

    this.checkUserOwnsSchedule(userId, existingSchedule);

    return this.schedulesRepository.deleteScheduleById(scheduleId);
  }

  checkUserOwnsSchedule(userId: number, schedule: Pick<Schedule, "id" | "userId">): void {
    if (userId !== schedule.userId) {
      throw new ForbiddenException(`User with ID=${userId} does not own schedule with ID=${schedule.id}`);
    }
  }
}
