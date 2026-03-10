import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { BookingAuditTriggerTasker as BaseBookingAuditTriggerTasker } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingAuditTriggerTaskerService extends BaseBookingAuditTriggerTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
