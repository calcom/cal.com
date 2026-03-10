import { Logger } from "@/lib/logger.bridge";
import { BookingAuditTaskConsumerService } from "@/lib/services/tasker/booking-audit-task-consumer.service";
import { Injectable } from "@nestjs/common";

import { BookingAuditSyncTasker as BaseBookingAuditSyncTasker } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingAuditSyncTaskerService extends BaseBookingAuditSyncTasker {
  constructor(bookingAuditTaskConsumer: BookingAuditTaskConsumerService, logger: Logger) {
    super({
      logger,
      bookingAuditTaskConsumer,
    });
  }
}
