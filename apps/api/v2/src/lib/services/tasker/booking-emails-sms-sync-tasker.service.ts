import { Logger } from "@/lib/logger.bridge";
import { BookingEmailAndSmsTaskService } from "@/lib/services/tasker/booking-emails-sms-task.service";
import { Injectable } from "@nestjs/common";

import { BookingEmailAndSmsSyncTasker as BaseBookingEmailAndSmsSyncTaskerService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingEmailAndSmsSyncTaskerService extends BaseBookingEmailAndSmsSyncTaskerService {
  constructor(bookingTaskService: BookingEmailAndSmsTaskService, logger: Logger) {
    super({
      logger,
      bookingTaskService,
    });
  }
}
