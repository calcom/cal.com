import { BookingEmailSmsHandler } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";

@Injectable()
export class BookingEmailSmsService extends BookingEmailSmsHandler {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
