import { Injectable } from "@nestjs/common";

import { BookingEventHandlerService as BaseBookingEventHandlerService } from "@calcom/platform-libraries/bookings";

import { Logger } from "@/lib/logger.bridge";

import { HashedLinkService } from "./hashed-link.service";

@Injectable()
export class BookingEventHandlerService extends BaseBookingEventHandlerService {
  constructor(hashedLinkService: HashedLinkService, bridgeLogger: Logger) {
    super({
      log: bridgeLogger,
      hashedLinkService,
    });
  }
}

