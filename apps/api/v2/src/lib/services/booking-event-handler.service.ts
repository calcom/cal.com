import { BookingEventHandlerService as BaseBookingEventHandlerService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { BookingAuditProducerService } from "./booking-audit-producer.service";
import { HashedLinkService } from "./hashed-link.service";
import { Logger } from "@/lib/logger.bridge";

@Injectable()
export class BookingEventHandlerService extends BaseBookingEventHandlerService {
  constructor(
    hashedLinkService: HashedLinkService,
    bridgeLogger: Logger,
    bookingAuditProducerService: BookingAuditProducerService
  ) {
    super({
      log: bridgeLogger,
      hashedLinkService,
      bookingAuditProducerService,
    });
  }
}
