import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { CacheService } from "@/lib/services/cache.service";
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
    cacheService: CacheService,
    checkBookingAndDurationLimitsService: CheckBookingAndDurationLimitsService,
    prismaWriteService: PrismaWriteService,
    bookingRepository: PrismaBookingRepository,
    hashedLinkService: HashedLinkService,
    luckyUserService: LuckyUserService,
    userRepository: PrismaUserRepository,
    bookingEmailAndSmsTasker: BookingEmailAndSmsTasker
  ) {
    super({
      cacheService,
      checkBookingAndDurationLimitsService,
      prismaClient: prismaWriteService.prisma as unknown as PrismaClient,
      bookingRepository,
      hashedLinkService,
      luckyUserService,
      userRepository,
      bookingEmailAndSmsTasker,
    });
  }
}
