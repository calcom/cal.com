import { RegularBookingService as BaseRegularBookingService } from "@calcom/platform-libraries/bookings";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { CheckBookingAndDurationLimitsService } from "@/lib/services/check-booking-and-duration-limits.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { LuckyUserService } from "@/lib/services/lucky-user.service";
import { BookingEmailAndSmsTasker } from "@/lib/services/tasker/booking-emails-sms-tasker.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class RegularBookingService extends BaseRegularBookingService {
  constructor(
    checkBookingAndDurationLimitsService: CheckBookingAndDurationLimitsService,
    prismaWriteService: PrismaWriteService,
    bookingRepository: PrismaBookingRepository,
    hashedLinkService: HashedLinkService,
    luckyUserService: LuckyUserService,
    userRepository: PrismaUserRepository,
    bookingEmailAndSmsTasker: BookingEmailAndSmsTasker,
    featuresRepository: PrismaFeaturesRepository,
    bookingEventHandler: BookingEventHandlerService
  ) {
    super({
      checkBookingAndDurationLimitsService,
      prismaClient: prismaWriteService.prisma as unknown as PrismaClient,
      bookingRepository,
      hashedLinkService,
      luckyUserService,
      userRepository,
      bookingEmailAndSmsTasker,
      featuresRepository,
      bookingEventHandler,
    });
  }
}
