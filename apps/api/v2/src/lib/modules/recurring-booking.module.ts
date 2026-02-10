import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { Module } from "@nestjs/common";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { Logger } from "@/lib/logger.bridge";
import { Scope } from "@nestjs/common";
import { BookingAuditProducerService } from "@/lib/services/booking-audit-producer.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { TaskerService } from "@/lib/services/tasker.service";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { PrismaWorkerModule } from "@/modules/prisma/prisma-worker.module";
@Module({
  imports: [RegularBookingModule, PrismaWorkerModule],
  providers: [
    RecurringBookingService,
    BookingEventHandlerService,
    /** Required by BookingEventHandlerService - Starts **/
    HashedLinkService,
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    BookingAuditProducerService,
    TaskerService,
    /** Required by BookingEventHandlerService - Ends **/
    /** Required by RecurringBookingService **/
    PrismaFeaturesRepository,
  ],
  exports: [RecurringBookingService],
})
export class RecurringBookingModule { }
