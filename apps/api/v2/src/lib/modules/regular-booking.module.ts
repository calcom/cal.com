import { PrismaAttributeRepository } from "@/lib/repositories/prisma-attribute.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaHostRepository } from "@/lib/repositories/prisma-host.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaRoutingFormResponseRepository } from "@/lib/repositories/prisma-routing-form-response.repository";
import { PrismaSelectedSlotRepository } from "@/lib/repositories/prisma-selected-slot.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { Logger } from "@/lib/logger.bridge";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
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
    PrismaSelectedSlotRepository,
    PrismaUserRepository,
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
    },
    BookingEventHandlerService,
    CheckBookingAndDurationLimitsService,
    CheckBookingLimitsService,
    HashedLinkService,
    LuckyUserService,
    RegularBookingService,
    PrismaRoutingFormResponseRepository,
  ],
  exports: [RegularBookingService],
})
export class RegularBookingModule {}
