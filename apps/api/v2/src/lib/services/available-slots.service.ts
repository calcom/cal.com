import { PrismaBookingRepository } from "@/lib/repositories/prismaBookingRepository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prismaEventTypeRepository";
import { PrismaOOORepository } from "@/lib/repositories/prismaOOORepository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prismaRoutingFormResponseRepository";
import { PrismaScheduleRepository } from "@/lib/repositories/prismaScheduleRepository";
import { PrismaSelectedSlotsRepository } from "@/lib/repositories/prismaSelectedSlotsRepository";
import { PrismaTeamRepository } from "@/lib/repositories/prismaTeamRepository";
import { PrismaUserRepository } from "@/lib/repositories/prismaUserRepository";
import { Injectable } from "@nestjs/common";

import { AvailableSlotsService as BaseAvailableSlotsService } from "@calcom/platform-libraries/slots";

@Injectable()
export class AvailableSlotsService extends BaseAvailableSlotsService {
  constructor(
    private readonly oooRepoDependency: PrismaOOORepository,
    private readonly scheduleRepoDependency: PrismaScheduleRepository,
    private readonly teamRepository: PrismaTeamRepository,
    private readonly routingFormResponseRepository: PrismaRoutingFormResponseRepository,
    private readonly bookingRepository: PrismaBookingRepository,
    private readonly selectedSlotsRepository: PrismaSelectedSlotsRepository,
    private readonly eventTypeRepository: PrismaEventTypeRepository,
    private readonly userRepository: PrismaUserRepository
  ) {
    super({
      oooRepo: oooRepoDependency,
      scheduleRepo: scheduleRepoDependency,
      teamRepo: teamRepository,
      routingFormResponseRepo: routingFormResponseRepository,
      bookingRepo: bookingRepository,
      selectedSlotsRepo: selectedSlotsRepository,
      eventTypeRepo: eventTypeRepository,
      userRepo: userRepository,
    });
  }
}
