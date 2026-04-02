import {
  BookingAuditTaskerProducerService,
  getAuditActorRepository,
} from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { TaskerService } from "@/lib/services/tasker.service";

@Injectable()
export class BookingAuditProducerService extends BookingAuditTaskerProducerService {
  constructor(taskerService: TaskerService, bridgeLogger: Logger) {
    super({
      tasker: taskerService.getTasker(),
      log: bridgeLogger,
      auditActorRepository: getAuditActorRepository(),
    });
  }
}
