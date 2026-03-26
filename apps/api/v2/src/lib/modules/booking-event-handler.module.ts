import { Logger } from "@/lib/logger.bridge";
import { BookingAuditProducerService } from "@/lib/services/booking-audit-producer.service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { TaskerService } from "@/lib/services/tasker.service";
import { Module, Scope } from "@nestjs/common";

@Module({
  providers: [
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    TaskerService,
    HashedLinkService,
    BookingAuditProducerService,
    BookingEventHandlerService,
  ],
  exports: [BookingEventHandlerService],
})
export class BookingEventHandlerModule {}
