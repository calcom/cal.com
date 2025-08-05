import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";

import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";

import { Injectable } from "@nestjs/common";

import { UserAvailabilityService as BaseUserAvailabilityService } from "@calcom/platform-libraries/schedules";

@Injectable()
export class UserAvailabilityService extends BaseUserAvailabilityService {
  constructor(
    oooRepoDependency: PrismaOOORepository,
    bookingRepository: PrismaBookingRepository,
    eventTypeRepository: PrismaEventTypeRepository,

   
  ) {
    super({
      oooRepo: oooRepoDependency,
     
      bookingRepo: bookingRepository,

      eventTypeRepo: eventTypeRepository,
    });
  }
}
