import { Logger } from "@/lib/logger.bridge";
import { BookingAuditSyncTaskerService } from "@/lib/services/tasker/booking-audit-sync-tasker.service";
import { BookingAuditTriggerTaskerService } from "@/lib/services/tasker/booking-audit-trigger-tasker.service";
import { Injectable } from "@nestjs/common";

import { BookingAuditTasker as BaseBookingAuditTasker } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingAuditTaskerService extends BaseBookingAuditTasker {
  constructor(
    syncTasker: BookingAuditSyncTaskerService,
    asyncTasker: BookingAuditTriggerTaskerService,
    logger: Logger
  ) {
    super({
      logger,
      asyncTasker,
      syncTasker,
    });
  }
}
