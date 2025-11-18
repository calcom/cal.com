import { PrismaAttributeRepository } from "@/lib/repositories/prisma-attribute.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaHostRepository } from "@/lib/repositories/prisma-host.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { CacheService } from "@/lib/services/cache.service";
import { CheckBookingAndDurationLimitsService } from "@/lib/services/check-booking-and-duration-limits.service";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { LuckyUserService } from "@/lib/services/lucky-user.service";
import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaAttributeRepository,
    PrismaBookingRepository,
    PrismaFeaturesRepository,
    PrismaHostRepository,
    PrismaOOORepository,
    PrismaUserRepository,
    CacheService,
    CheckBookingAndDurationLimitsService,
    CheckBookingLimitsService,
    HashedLinkService,
    LuckyUserService,
    RegularBookingService,
  ],
  exports: [RegularBookingService],
})
export class RegularBookingModule { }
