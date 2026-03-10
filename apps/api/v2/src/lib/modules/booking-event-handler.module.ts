import { Logger } from "@/lib/logger.bridge";
import { BookingAuditProducerService } from "@/lib/services/booking-audit-producer.service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { BookingAuditTaskerModule } from "@/lib/modules/booking-audit-tasker.module";
import { Module, Scope } from "@nestjs/common";

@Module({
  imports: [BookingAuditTaskerModule],
  providers: [
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    HashedLinkService,
    BookingAuditProducerService,
    BookingEventHandlerService,
  ],
  exports: [BookingEventHandlerService],
})
export class BookingEventHandlerModule {}
