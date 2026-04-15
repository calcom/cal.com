import { Module, Scope } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { HashedLinkService } from "@/lib/services/hashed-link.service";
import { TaskerService } from "@/lib/services/tasker.service";

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
    BookingEventHandlerService,
  ],
  exports: [BookingEventHandlerService],
})
export class BookingEventHandlerModule {}
