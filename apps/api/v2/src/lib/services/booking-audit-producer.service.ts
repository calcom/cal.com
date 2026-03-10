import { Logger } from "@/lib/logger.bridge";
import { BookingAuditTaskerService } from "@/lib/services/tasker/booking-audit-tasker.service";
import { Injectable } from "@nestjs/common";

import { BookingAuditTaskerProducerService, getAuditActorRepository } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingAuditProducerService extends BookingAuditTaskerProducerService {
  constructor(bookingAuditTasker: BookingAuditTaskerService, bridgeLogger: Logger) {
    super({
      bookingAuditTasker,
      log: bridgeLogger,
      auditActorRepository: getAuditActorRepository(),
    });
  }
}
