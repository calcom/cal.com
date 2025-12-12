import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { CheckBookingAndDurationLimitsService } from "@/lib/services/check-booking-and-duration-limits.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { LuckyUserService } from "@/lib/services/lucky-user.service";
import { BookingEmailAndSmsTasker } from "@/lib/services/tasker/booking-emails-sms-tasker.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { RegularBookingService as BaseRegularBookingService } from "@calcom/platform-libraries/bookings";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class RegularBookingService extends BaseRegularBookingService {
  constructor(
    checkBookingAndDurationLimitsService: CheckBookingAndDurationLimitsService,
    prismaWriteService: PrismaWriteService,
    bookingRepository: PrismaBookingRepository,
    selectedSlotsRepository: PrismaSelectedSlotRepository,
    hashedLinkService: HashedLinkService,
    luckyUserService: LuckyUserService,
    userRepository: PrismaUserRepository,
    routingFormResponseRepository: PrismaRoutingFormResponseRepository,
    bookingEmailAndSmsTasker: BookingEmailAndSmsTasker,
    featuresRepository: PrismaFeaturesRepository,
    bookingEventHandler: BookingEventHandlerService
  ) {
    super({
      checkBookingAndDurationLimitsService,
      prismaClient: prismaWriteService.prisma as unknown as PrismaClient,
      bookingRepository,
      selectedSlotsRepository,
      hashedLinkService,
      luckyUserService,
      userRepository,
      routingFormResponseRepository,
      bookingEmailAndSmsTasker,
      featuresRepository,
      bookingEventHandler,
    });
  }
}
