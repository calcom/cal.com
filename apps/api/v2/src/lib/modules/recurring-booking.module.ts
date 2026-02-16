import { Module, Scope } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { BookingAuditProducerService } from "@/lib/services/booking-audit-producer.service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { TaskerService } from "@/lib/services/tasker.service";
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
export class RecurringBookingModule {}
