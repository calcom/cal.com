import { Logger } from "@/lib/logger.bridge";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { BookingEmailSmsService } from "@/lib/services/booking-emails-sms-service";
import { Injectable } from "@nestjs/common";

import { BookingEmailAndSmsTaskService as BaseBookingEmailAndSmsTaskService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class BookingEmailAndSmsTaskService extends BaseBookingEmailAndSmsTaskService {
  constructor(
    bookingEmailSmsService: BookingEmailSmsService,
    bookingRepository: PrismaBookingRepository,
    logger: Logger
  ) {
    super({
      logger,
      emailsAndSmsHandler: bookingEmailSmsService,
      bookingRepository,
    });
  }
}
