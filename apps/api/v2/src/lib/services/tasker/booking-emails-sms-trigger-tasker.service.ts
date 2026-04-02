import { BookingEmailAndSmsTriggerDevTasker as BaseBookingEmailAndSmsTriggerDevTasker } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";

@Injectable()
export class BookingEmailAndSmsTriggerTaskerService extends BaseBookingEmailAndSmsTriggerDevTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
