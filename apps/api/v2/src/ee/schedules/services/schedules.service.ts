import { CreateScheduleInput } from "@/ee/schedules/inputs/create-schedule.input";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { AvailabilitiesService } from "@/modules/availabilities/availabilities.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SchedulesService {
  constructor(
    private readonly schedulesRepository: SchedulesRepository,
    private readonly availabilitiesService: AvailabilitiesService
  ) {}

  async createScheduleWithDefaultAvailabilities(userId: number, schedule: CreateScheduleInput) {
    const defaultAvailability = this.availabilitiesService.getDefaultAvailability();

    const createdSchedule = await this.schedulesRepository.createScheduleWithAvailability(
      userId,
      schedule,
      defaultAvailability
    );

    return createdSchedule;
  }
}
