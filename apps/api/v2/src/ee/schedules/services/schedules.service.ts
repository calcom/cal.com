import { CreateScheduleInput } from "@/ee/schedules/inputs/create-schedule.input";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { AvailabilitiesService } from "@/modules/availabilities/availabilities.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { ForbiddenException, Injectable } from "@nestjs/common";

@Injectable()
export class SchedulesService {
  constructor(
    private readonly schedulesRepository: SchedulesRepository,
    private readonly availabilitiesService: AvailabilitiesService,
    private readonly usersRepository: UsersRepository
  ) {}

  async createUserSchedule(userId: number, schedule: CreateScheduleInput) {
    const availabilities = schedule.availabilities || [this.availabilitiesService.getDefaultAvailability()];

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
    const schedule = await this.schedulesRepository.getScheduleById(scheduleId);

    if (schedule?.userId !== userId) {
      throw new ForbiddenException(`User with ID=${userId} does not own schedule with ID=${scheduleId}`);
    }

    return schedule;
  }

  async getUserSchedules(userId: number) {
    return this.schedulesRepository.getSchedulesByUserId(userId);
  }
}
