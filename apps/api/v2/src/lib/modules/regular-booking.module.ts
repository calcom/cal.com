import { Logger } from "@/lib/logger.bridge";
import { PrismaAttributeRepository } from "@/lib/repositories/prisma-attribute.repository";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaHostRepository } from "@/lib/repositories/prisma-host.repository";
import { PrismaOOORepository } from "@/lib/repositories/prisma-ooo.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";
import { BookingAuditProducerService } from "@/lib/services/booking-audit-producer.service";
import { BookingEmailSmsService } from "@/lib/services/booking-emails-sms-service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { CheckBookingAndDurationLimitsService } from "@/lib/services/check-booking-and-duration-limits.service";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { LuckyUserService } from "@/lib/services/lucky-user.service";
import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { BookingEmailAndSmsSyncTaskerService } from "@/lib/services/tasker/booking-emails-sms-sync-tasker.service";
import { BookingEmailAndSmsTaskService } from "@/lib/services/tasker/booking-emails-sms-task.service";
import { BookingEmailAndSmsTasker } from "@/lib/services/tasker/booking-emails-sms-tasker.service";
import { BookingEmailAndSmsTriggerTaskerService } from "@/lib/services/tasker/booking-emails-sms-trigger-tasker.service";
import { TaskerService } from "@/lib/services/tasker.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module, Scope } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaAttributeRepository,
    PrismaBookingRepository,
    PrismaFeaturesRepository,
    PrismaHostRepository,
    PrismaOOORepository,
    PrismaUserRepository,
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    BookingAuditProducerService,
    BookingEventHandlerService,
    CheckBookingAndDurationLimitsService,
    CheckBookingLimitsService,
    HashedLinkService,
    LuckyUserService,
    BookingEmailSmsService,
    BookingEmailAndSmsTaskService,
    BookingEmailAndSmsSyncTaskerService,
    BookingEmailAndSmsTriggerTaskerService,
    BookingEmailAndSmsTasker,
    TaskerService,
    RegularBookingService,
  ],
  exports: [RegularBookingService],
})
export class RegularBookingModule {}
