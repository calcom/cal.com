import { Injectable } from "@nestjs/common";

import { BookingEventHandlerService as BaseBookingEventHandlerService } from "@calcom/platform-libraries/bookings";

import { Logger } from "@/lib/logger.bridge";

import { BookingAuditProducerService } from "./booking-audit-producer.service";
import { HashedLinkService } from "./hashed-link.service";

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
