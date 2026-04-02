import { BookingEmailAndSmsSyncTasker as BaseBookingEmailAndSmsSyncTaskerService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { BookingEmailAndSmsTaskService } from "@/lib/services/tasker/booking-emails-sms-task.service";

@Injectable()
export class BookingEmailAndSmsSyncTaskerService extends BaseBookingEmailAndSmsSyncTaskerService {
  constructor(bookingTaskService: BookingEmailAndSmsTaskService, logger: Logger) {
    super({
      logger,
      bookingTaskService,
    });
  }
}
