import { PrismaAttributeRepository } from "@/lib/repositories/prisma-attribute.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaHostRepository } from "@/lib/repositories/prisma-host.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { CacheService } from "@/lib/services/cache.service";
import { CheckBookingAndDurationLimitsService } from "@/lib/services/check-booking-and-duration-limits.service";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { LuckyUserService } from "@/lib/services/lucky-user.service";
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
    featuresRepository: PrismaFeaturesRepository,
    checkBookingLimitsService: CheckBookingLimitsService,
    luckyUserService: LuckyUserService,
    hostRepository: PrismaHostRepository,
    oooRepository: PrismaOOORepository,
    userRepository: PrismaUserRepository,
    attributeRepository: PrismaAttributeRepository
  ) {
    super({
      cacheService,
      checkBookingAndDurationLimitsService,
      prismaClient: prismaWriteService.prisma as unknown as PrismaClient,
      bookingRepository,
      featuresRepository,
      checkBookingLimitsService,
      luckyUserService,
      hostRepository,
      oooRepository,
      userRepository,
      attributeRepository,
    });
  }
}
