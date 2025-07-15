import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaSelectedSlotsRepository } from "@/lib/repositories/prisma-selected-slots.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
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
