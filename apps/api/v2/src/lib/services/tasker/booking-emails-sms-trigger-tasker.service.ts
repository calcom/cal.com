import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { BookingEmailAndSmsTriggerDevTasker as BaseBookingEmailAndSmsTriggerDevTasker } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingEmailAndSmsTriggerTaskerService extends BaseBookingEmailAndSmsTriggerDevTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
