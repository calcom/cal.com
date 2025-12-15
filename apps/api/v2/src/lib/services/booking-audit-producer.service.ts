import { TaskerService } from "@/lib/services/tasker.service";
import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { BookingAuditTaskerProducerService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingAuditProducerService extends BookingAuditTaskerProducerService {
  constructor(taskerService: TaskerService, logger: Logger) {
    super({
      tasker: taskerService.getTasker(),
      log: logger,
    });
  }
}

