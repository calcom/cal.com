import { OOORepository } from "@/lib/repositories/PrismaOOORepository";
import { ScheduleRepository } from "@/lib/repositories/PrismaScheduleRepository";
import { Injectable } from "@nestjs/common";

import { AvailableSlotsService as BaseAvailableSlotsService } from "@calcom/platform-libraries/slots";

@Injectable()
export class AvailableSlotsService extends BaseAvailableSlotsService {
  constructor(
    private readonly oooRepoDependency: OOORepository,
    private readonly scheduleRepoDependency: ScheduleRepository
  ) {
    super({ oooRepo: oooRepoDependency, scheduleRepo: scheduleRepoDependency });
  }
}
