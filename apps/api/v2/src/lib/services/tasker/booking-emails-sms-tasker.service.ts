import { BookingEmailAndSmsTasker as BaseBookingEmailAndSmsTasker } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { BookingEmailAndSmsSyncTaskerService } from "@/lib/services/tasker/booking-emails-sms-sync-tasker.service";
import { BookingEmailAndSmsTriggerTaskerService } from "@/lib/services/tasker/booking-emails-sms-trigger-tasker.service";

@Injectable()
export class BookingEmailAndSmsTasker extends BaseBookingEmailAndSmsTasker {
  constructor(
    syncTasker: BookingEmailAndSmsSyncTaskerService,
    asyncTasker: BookingEmailAndSmsTriggerTaskerService,
    logger: Logger
  ) {
    super({
      logger,
      asyncTasker: asyncTasker,
      syncTasker: syncTasker,
    });
  }
}
