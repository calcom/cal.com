import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { Injectable } from "@nestjs/common";

import { CheckBookingLimitsService as BaseCheckBookingLimitsService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class CheckBookingLimitsService extends BaseCheckBookingLimitsService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
    });
  }
}
