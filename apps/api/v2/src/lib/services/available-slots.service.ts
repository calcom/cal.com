import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaScheduleRepository } from "@/lib/repositories/prisma-schedule.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { Injectable } from "@nestjs/common";

import { SelectedSlotRepositoryInterface } from "@calcom/lib/server/repository/selectedSlot";
import { AvailableSlotsService as BaseAvailableSlotsService } from "@calcom/platform-libraries/slots";

@Injectable()
export class AvailableSlotsService extends BaseAvailableSlotsService {
  constructor(
    private readonly oooRepoDependency: PrismaOOORepository,
    private readonly scheduleRepoDependency: PrismaScheduleRepository,
    private readonly teamRepository: PrismaTeamRepository,
    private readonly routingFormResponseRepository: PrismaRoutingFormResponseRepository,
    private readonly bookingRepository: PrismaBookingRepository,
    private readonly selectedSlotRepository: PrismaSelectedSlotRepository,
    private readonly eventTypeRepository: PrismaEventTypeRepository,
    private readonly userRepository: PrismaUserRepository
  ) {
    super({
      oooRepo: oooRepoDependency,
      scheduleRepo: scheduleRepoDependency,
      teamRepo: teamRepository,
      routingFormResponseRepo: routingFormResponseRepository,
      bookingRepo: bookingRepository,
      selectedSlotRepo: selectedSlotRepository,
      eventTypeRepo: eventTypeRepository,
      userRepo: userRepository,
    });
  }
}
