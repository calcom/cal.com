import { Injectable } from "@nestjs/common";

import { BookingAuditTaskerProducerService } from "@calcom/features/booking-audit/lib/service/BookingAuditTaskerProducerService";
import { getTasker } from "@calcom/features/tasker/tasker-factory";

@Injectable()
export class BookingAuditProducerService extends BookingAuditTaskerProducerService {
  constructor() {
    super({
      tasker: getTasker(),
    });
  }
}

