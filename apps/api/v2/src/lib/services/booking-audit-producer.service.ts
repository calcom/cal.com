import { TaskerService } from "@/lib/services/tasker.service";
import { Injectable } from "@nestjs/common";

import { BookingAuditTaskerProducerService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingAuditProducerService extends BookingAuditTaskerProducerService {
  constructor(taskerService: TaskerService) {
    super({
      tasker: taskerService.getTasker(),
    });
  }
}

